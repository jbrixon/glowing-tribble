class TestStoreAdapter {
  #cache;
  
  constructor() {
    this.#cache = {};
  }

  put(key, value, ttl=0) {
    const created = new Date();
    
    this.#cache[key] = {
      value,
      ttl,
      created,
      expires: new Date(created).setSeconds(created.getSeconds() + ttl),
    };
  }

  get(key) {
    if (!(key in this.#cache)) return;
    return this.#checkForFreshness(this.#cache[key]);
  }

  evict(key) {
    delete this.#cache[key];
  }

  clear() {
    this.#cache = {};
  }

  size() {
    return Object.keys(this.#cache).length;
  }


  #checkForFreshness(cache) {
    if (cache.ttl !== 0 && cache.expires < new Date()) { // expired
      delete this.#cache[key];
      return;
    }

    return cache.value;
  }
}


export default TestStoreAdapter;
