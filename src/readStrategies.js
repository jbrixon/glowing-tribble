export default {
  readThrough: "READ_THROUGH", // read from cache. if cache miss, read from store. then update cache.
  readAround: "READ_AROUND", // read from store. right to cache on success. if not reachable, check cache.
};
