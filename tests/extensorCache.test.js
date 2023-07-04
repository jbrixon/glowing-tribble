import ExtensorCache from "../src/extensorCache";
import InMemoryStoreAdapter from "../src/inMemoryStoreAdapter";
import KeyConfig from "../src/keyConfig";
import ReadStrategies from "../src/readStrategies";


describe("extensorCache", () => {
  let cache, store;
  jest.useFakeTimers();

  beforeEach(() => {
    store = new InMemoryStoreAdapter();
    cache = new ExtensorCache(store);
  });


  test("key-value pairs are stored in the cache", async () => {
    const testKey = "test-key";
    const testValue = "123";

    await cache.put(testKey, testValue);

    expect(store.get(testKey)).toEqual(testValue);
  });


  test("the promise is rejected if the requested key is not stored", async () => {
    const testKey = "test-key";
    expect.assertions(1);
    await expect(cache.get(testKey)).rejects.toEqual(new Error("Key not found"));
  });


  test("the value is returned if the requested key is in cache", async () => {
    const testKey = "test-key";
    const testValue = "test-value";

    store.put(testKey, testValue);

    const returnedValue = await cache.get(testKey);
    expect(returnedValue).toEqual(testValue);
  });


  test("the correct size of the cache is returned", () => {
    expect(cache.size()).toEqual(0);

    store.put("test-key-0", "test-value");
    expect(cache.size()).toEqual(1);

    store.put("test-key-1", "test-value");
    expect(cache.size()).toEqual(2);
  });


  test("containsKey returns false when a key-value pair is not cached", () => {
    expect(cache.containsKey("test-key")).toBe(false);
  });

  
  test("containsKey returns true when a key-value pair is not cached", () => {
    const testKey = "test-key";
    
    store.put(testKey, "test-value")

    expect(cache.containsKey(testKey)).toBe(true);
  });


  test("evict removes key value pairs from the cache", () => {
    const testKey = "test-key";
    
    store.put(testKey, "test-value")

    cache.evict(testKey);

    expect(store.get(testKey)).toEqual(undefined);
  });


  test("no exception is thrown when an attempt is made to evict a non-existent key", () => {
    expect(() => cache.evict("test-key")).not.toThrow();
  });


  test("clear empties the cache", () => {    
    store.put("test-key-0", "test-value");   
    store.put("test-key-1", "test-value");

    cache.clear();

    expect(store.size()).toEqual(0);
  });


  test("an error is thrown when an invalid key pattern is registered", () => {
    const testPattern = "test/{}";
    const config = new KeyConfig(testPattern);
    expect(() => cache.register(config)).toThrow();
  });
});
