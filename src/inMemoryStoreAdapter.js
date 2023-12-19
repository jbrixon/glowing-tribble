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
    return this.#checkForFreshness(key);
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


  #checkForFreshness(key) {
    const cache = this.#cache[key];
    if (!cache) return;
    const now = new Date();
    // console.log(key)
    // console.log(cache.ttl !== 0 && cache.expires < now);
    if (cache.ttl !== 0 && cache.expires < now) { // expired
      console.log(`Deleting ${key}`)
      delete this.#cache[key];
      return;
    }

    return cache.value;
  }


  #activelyDeleteExpiredValues() {
    const keys = Object.keys(this.#cache);
    let selectedKeys = [];

    if (keys.length <= 20) {
      selectedKeys = keys;
    } else {
      for (let i = 0, c = 20; i < c; i++) {
        const randomIndex = Math.floor(Math.random() * keys.length);
        const key = keys[randomIndex];
        if (!selectedKeys.includes(key)) selectedKeys.push(keys[randomIndex]);
      }
    }

    console.log(`Checking ${selectedKeys.length} for expired values`);

    for (const key of selectedKeys) {
      this.#checkForFreshness(key);
    }
  }
}


export default InMemoryStoreAdapter;
