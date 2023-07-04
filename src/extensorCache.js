import {
  checkForMatch,
  keyPatternIsvalid,
} from "./patternMatching";
import ReadStrategies from "./readStrategies";
import WriteStrategies from "./writeStrategies";


class ExtensorCache {
  #store;
  #configRegister;
  
  constructor(store) {
    this.#store = store;
    this.#configRegister = [];
  }


  async put(key, value) {
    const route = this.#findRoute(key);

    // write-through
    if (route?.cachingConfig.writeStrategy === WriteStrategies.writeThrough) {
      try {
        await route.cachingConfig.writeCallback(route.context);
      } catch (error) {
        throw error;
      }
    }

    // write-back
    if (route?.cachingConfig.writeStrategy === WriteStrategies.writeBack) {
      this.#writeBack(route);
    }

    // no write strategy
    this.#store.put(key, value);
  }


  async get(key) {
    const route = this.#findRoute(key);

    // read-through
    if (route?.cachingConfig.readStrategy === ReadStrategies.readThrough) {
      const cachedValue = this.#store.get(key);
      if (cachedValue !== undefined) return cachedValue;
      const freshValue = await route.cachingConfig.readCallback(route.context);
      this.#store.put(key, freshValue);
      return freshValue;
    }

    // read-around
    if (route?.cachingConfig.readStrategy == ReadStrategies.readAround) {
      let freshValue;
      try {
        freshValue = await route.cachingConfig.readCallback(route.context);
        this.#store.put(key, freshValue);
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


  register(config) {
    if (!keyPatternIsvalid(config.pattern)) {
      throw new Error("Invalid key pattern!");
    }
    this.#configRegister.push(config);
  }


  evict(key) {
    this.#store.evict(key);
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


  async #writeBack(route) {
    let tryCount = route.cachingConfig.writeRetryCount + 1;
    for (let i = 0; i < tryCount; i++) {
      try {
        await route.cachingConfig.writeCallback(route.context);
        return;
      } catch (error) {
        console.info(error);
        await new Promise(resolve => setTimeout(resolve, route.cachingConfig.writeRetryInterval));
      }
    }
    console.warn(`Write back failed after ${tryCount} attempts. Giving up.`);
  }


  #findRoute(key) {
    for (const cachingConfig of this.#configRegister) {
      const context = checkForMatch(cachingConfig.pattern, key);
      if (context.match) {
        return {
          cachingConfig,
          context,
        };
      }
    }
  }
}


export default ExtensorCache;
