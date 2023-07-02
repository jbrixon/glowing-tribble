class InMemoryStoreAdapter {
  #cache;
  
  constructor() {
    this.#cache = {};
  }

  put(key, value) {
    this.#cache[key] = value;
  }

  get(key) {
    if (!(key in this.#cache)) return;
    return this.#cache[key];
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
