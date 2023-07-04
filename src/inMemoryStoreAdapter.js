class InMemoryStoreAdapter {
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
    const cache = this.#cache[key];

    if (cache.ttl !== 0 && cache.expires < new Date()) { // expired
      delete this.#cache[key];
      return;
    }

    return cache.value;
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
}


export default InMemoryStoreAdapter;
