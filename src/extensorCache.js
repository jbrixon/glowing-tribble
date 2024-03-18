import { checkForMatch, keyPatternIsvalid } from "./patternMatching";
import ReadStrategies from "./readStrategies";
import WriteStrategies from "./writeStrategies";

// Class representing a cache manager.
class ExtensorCache {
  #store;
  #globalConfig;
  #patternRegister;

  /**
   * Create a cache manager.
   * @param {object} store 
   * @param {GlobalConfig} [globalConfig]
   */
  constructor(store, globalConfig = {}) {
    this.#store = store;
    this.#globalConfig = globalConfig;
    this.#patternRegister = [];
  }

  /**
   * Write and cache a value.
   * @param {string} key 
   * @param {*} value 
   * @returns a Promise which resolves when the put attempt has finished, whether
   * through success of failure.
   */
  async put(key, value) {
    const route = this.#findRoute(key);

    // write-through
    if (route?.keyConfig.writeStrategy === WriteStrategies.writeThrough) {
      return route.keyConfig.writeCallback(route.context).then(() => {
        this.#store.put(key, value, route?.keyConfig.ttl);
      });
    }

    // no write strategy
    this.#store.put(key, value, route?.keyConfig.ttl);

    // write-back
    if (route?.keyConfig.writeStrategy === WriteStrategies.writeBack) {
      return this.#writeBack(route, route.keyConfig.writeCallback);
    }
  }

  /**
   * Fetch a value.
   * @param {string} key 
   * @returns the value of key. Depending on the configuration this will be either
   * a cached or live value.
   */
  async get(key) {
    const route = this.#findRoute(key);

    // read-through
    if (route?.keyConfig.readStrategy === ReadStrategies.readThrough) {
      const cachedValue = this.#store.get(key);
      if (cachedValue !== undefined) return cachedValue;
      const freshValue = await route.keyConfig.readCallback(route.context);
      this.#store.put(key, freshValue, route.keyConfig.ttl);
      return freshValue;
    }

    // read-around
    if (route?.keyConfig.readStrategy == ReadStrategies.readAround) {
      let freshValue;
      try {
        freshValue = await route.keyConfig.readCallback(route.context);
        this.#store.put(key, freshValue, route.keyConfig.ttl);
      } catch (error) {
        freshValue = this.#store.get(key);
        if (freshValue === undefined) {
          throw new Error(
            `Read callback for key ${key} failed due to ${error.name}: ${error.message}. The key was not found in the cache.`
          );
        } else {
          console.info(
            `Read callback for key ${key} failed due to ${error.name}: ${error.message}, reverting to cached value.`
          );
        }
      }
      return freshValue;
    }

    // no read strategy
    const cachedValue = this.#store.get(key);
    if (cachedValue === undefined) {
      throw new Error("Key not found");
    }
    return cachedValue;
  }

  /**
   * Update a value.
   * @param {string} key 
   * @param {*} value 
   * @returns a Promise which resolves when the update attempt has finished, whether
   * through success of failure.
   */
  async update(key, value) {
    const route = this.#findRoute(key);
    const updateCallbackIsGiven = route.keyConfig.updateCallback !== undefined;
    const callback = updateCallbackIsGiven
      ? route.keyConfig.updateCallback
      : route.keyConfig.writeCallback;

    // write-through
    if (route?.keyConfig.writeStrategy === WriteStrategies.writeThrough) {
      return callback(route.context).then(() => {
        this.#store.put(key, value, route?.keyConfig.ttl);
      });
    }

    // no write strategy
    this.#store.put(key, value, route?.keyConfig.ttl);

    // write-back
    if (route?.keyConfig.writeStrategy === WriteStrategies.writeBack) {
      return this.#writeBack(route, callback);
    }
  }

  /**
   * Delete a value.
   * @param {string} key 
   * @returns a Promise which resolves when the delete attempt has finished, whether
   * through success of failure.
   */
  async evict(key) {
    const route = this.#findRoute(key);

    // write-through
    if (route?.keyConfig.writeStrategy === WriteStrategies.writeThrough) {
      return route.keyConfig.evictCallback(route.context).then(() => {
        this.#store.evict(key);
      });
    }

    // no write strategy
    this.#store.evict(key);

    // write-back
    if (route?.keyConfig.writeStrategy === WriteStrategies.writeBack) {
      return this.#writeBack(route, route.keyConfig.evictCallback);
    }
  }

  /**
   * Add configuration for a new cached value.
   * @param {KeyConfig} config 
   */
  register(config) {
    if (!keyPatternIsvalid(config.pattern)) {
      throw new Error("Invalid key pattern!");
    }
    this.#patternRegister.push({ ...this.#globalConfig, ...config });
  }

  /**
   * Remove all cached values.
   */
  clear() {
    this.#store.clear();
  }

  /**
   * Check if a key exists in the cache.
   * @param {string} key 
   * @returns {boolean} true if the keys is present in the cache.
   */
  containsKey(key) {
    return this.#store.get(key) !== undefined;
  }

  /**
   * Count the number of keys stored in the cache.
   * @returns an integer Number representing the total number of keys stored.
   */
  size() {
    return this.#store.size();
  }

  /**
   * Handle callback for keys configured with write-back caching.
   * @param {RouteContext} route 
   * @param {Callback}
   * @returns {Promise} a Promise which resolves when the write has finished, either due to 
   * success or failure.
   */
  async #writeBack(route, callback) {
    const rejectDelay = (reason, attempt) => {
      return new Promise((resolve, reject) => {
        console.info(
          `Write back for key '${route.context.key}' failed due to ${reason}`
        );
        const nextTimeout =
          route.keyConfig.writeRetryInterval *
          (route.keyConfig.writeRetryBackoff ? 2 ** attempt : 1);
        const cappedTimeout = Math.min(
          route.keyConfig.writeRetryIntervalCap,
          nextTimeout
        );
        setTimeout(reject.bind(null, reason), cappedTimeout);
      });
    };

    const rejectQuit = (reason) => {
      console.info(
        `Write back for key '${route.context.key}' failed due to ${reason}`
      );
      console.warn(
        `Write back for key '${route.context.key}' failed after ${tryCount} attempts. Giving up.`
      );
    };

    const tryCount = route.keyConfig.writeRetryCount + 1; // include initial attempt
    let p = Promise.reject();

    for (let i = 0; i < tryCount; i++) {
      p = p
        .catch(() => callback(route.context))
        .catch(
          i < tryCount - 1 ? (reason) => rejectDelay(reason, i) : rejectQuit
        );
    }

    return p;
  }

  /**
   * Find the congifured route matching a key.
   * @param {string} key 
   * @returns {RouteContext} the route which matched the passed key.
   */
  #findRoute(key) {
    for (const keyConfig of this.#patternRegister) {
      const context = checkForMatch(keyConfig.pattern, key);
      if (context.match) {
        return {
          keyConfig,
          context,
        };
      }
    }
  }
}

export default ExtensorCache;
