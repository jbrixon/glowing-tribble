export default {
  cacheOnly: "CACHE_ONLY", // only write to cache.
  writeThrough: "WRITE_THROUGH", // write to both.
  writeBack: "WRITE_BACK", // write to cache and confirm. subsequent write to store.
};
