class InMemoryStoreAdapter {
  #cache;
  
  constructor() {
    this.#cache = {};

    setInterval(() => this.#activelyDeleteExpiredValues(), 100);
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


  #activelyDeleteExpiredValues() {
    const keys = Object.keys(this.#cache);
    const selectedKeys = [];

    for (let i = 0, c = Math.min(keys.length, 20); i < c; i++) {
      const randomIndex = Math.floor(Math.random() * keys.length);
      selectedKeys.push(keys[randomIndex]);
    }

    for (const key of selectedKeys) {
      this.#checkForFreshness(this.#cache[key]);
    }
  }
}


export default InMemoryStoreAdapter;
