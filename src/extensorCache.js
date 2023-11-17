import {
  checkForMatch,
  keyPatternIsvalid,
} from "./patternMatching";
import ReadStrategies from "./readStrategies";
import WriteStrategies from "./writeStrategies";


class ExtensorCache {
  #store;
  #patternRegister;
  
  constructor(store) {
    this.#store = store;
    this.#patternRegister = [];
  }


  async put(key, value) {
    const route = this.#findRoute(key);

    // write-through
    if (route?.keyConfig.writeStrategy === WriteStrategies.writeThrough) {
      return route.keyConfig.writeCallback(route.context)
        .then(() => {
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
          throw new Error(`Read callback for key ${key} failed due to ${error.name}: ${error.message}. The key was not found in the cache.`)
        } else {
          console.info(`Read callback for key ${key} failed due to ${error.name}: ${error.message}, reverting to cached value.`);
        }
      }
      return freshValue;
    }

    // no read strategy
    const cachedValue = this.#store.get(key);
    if (cachedValue === undefined) {
      throw new Error("Key not found")
    }
    return cachedValue;
  }


  async evict(key) {
    const route = this.#findRoute(key);
    if (!route) return;
    
        // write-through
    if (route.keyConfig.writeStrategy === WriteStrategies.writeThrough) {
      return route.keyConfig.evictCallback(route.context)
        .then(() => {
          this.#store.evict(key);
        });
    }

    // no write strategy
    this.#store.evict(key);

    // write-back
    if (route.keyConfig.writeStrategy === WriteStrategies.writeBack) {
      return this.#writeBack(route, route.keyConfig.evictCallback);
    }
  }


  register(config) {
    if (!keyPatternIsvalid(config.pattern)) {
      throw new Error("Invalid key pattern!");
    }
    this.#patternRegister.push(config);
  }


  clear() {
    this.#store.clear();
  }


  containsKey(key) {
    return this.#store.get(key) !== undefined;
  }


  size() {
    return this.#store.size();
  }


  async #writeBack(route, callback) {
    const rejectDelay = (reason) => {
      return new Promise((resolve, reject) => {
        console.info(`Write back for key '${route.context.key}' failed due to ${reason}`)
        setTimeout(reject.bind(null, reason), route.keyConfig.writeRetryInterval);
      });
    };

    const rejectQuit = (reason) => {
      console.info(`Write back for key '${route.context.key}' failed due to ${reason}`);
      console.warn(`Write back for key '${route.context.key}' failed after ${tryCount} attempts. Giving up.`);
    };

    const tryCount = route.keyConfig.writeRetryCount + 1; // include initial attempt
    let p = Promise.reject();

    for (let i = 0; i < tryCount; i++) {
      p = p.catch(() => callback(route.context))
            .catch(i < tryCount - 1 ? rejectDelay : rejectQuit);
    }

    return p;
  }


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
