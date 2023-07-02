import ExtensorCache from "../src/extensorCache";
import InMemoryStoreAdapter from "../src/inMemoryStoreAdapter";
import CacheConfig from "../src/cacheConfig";
import WriteStrategies from "../src/writeStrategies";


describe("write-back caching", () => {
  let cache, store;

  beforeEach(() => {
    store = new InMemoryStoreAdapter();
    cache = new ExtensorCache(store);
  });


  test("the write callback is called", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";
    let called = false;

    const config = new CacheConfig(testPattern);
    config.writeCallback = async () => { called = true; };
    config.writeStrategy = WriteStrategies.writeBack;
    cache.register(config);
    
    await cache.put(testPattern, testValue);

    expect(called).toEqual(true);
  });


  test("the cache is updated when the callback resolves", async () => {
    const testPattern = "test/pattern";
    const goodResult = "good result";
    const badResult = "bad result";

    const config = new CacheConfig(testPattern);
    config.writeCallback = async () => {};
    config.writeStrategy = WriteStrategies.writeBack;
    cache.register(config);

    store.put(testPattern, badResult);

    await cache.put(testPattern, goodResult);

    expect(store.get(testPattern)).toEqual(goodResult);
  });


  test("the cache is updated when the callback rejects", async () => {
    const testPattern = "test/pattern";
    const goodResult = "good result";
    const badResult = "bad result";

    const config = new CacheConfig(testPattern);
    config.writeCallback = async () => { throw new Error(); };
    config.writeStrategy = WriteStrategies.writeBack;
    cache.register(config);

    store.put(testPattern, badResult);

    await cache.put(testPattern, goodResult);

    expect(store.get(testPattern)).toEqual(goodResult);
  });


  test("the promise is not rejected when the callback rejects", async () => {
    const testPattern = "test/pattern";
    const goodResult = "good result";

    const config = new CacheConfig(testPattern);
    config.writeCallback = async () => { throw new Error(); };
    config.writeStrategy = WriteStrategies.writeBack;
    cache.register(config);

    expect(cache.put(testPattern, goodResult)).resolves;
  });


  test("the callback is retried the requested number of times", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";
    const retries = 3;
    const interval = 100;
    const waitFor = (retries + 2) * interval;
    let countRetries = -1; // don't count first try

    const config = new CacheConfig(testPattern);
    config.writeCallback = async () => { 
      countRetries++;
      throw new Error();
    };
    config.writeStrategy = WriteStrategies.writeBack;
    config.writeRetryCount = retries;
    config.writeRetryInterval = interval;
    cache.register(config);
    
    await cache.put(testPattern, testValue);
    await new Promise(resolve => setTimeout(resolve, waitFor));

    expect(countRetries).toEqual(retries);
  });


  test("the callback is called at the requested interval", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";
    const retries = 3;
    const interval = 100;
    const waitFor = (retries + 2) * interval;
    
    let waitTimes = [];
    let timeOfLastCall;

    const config = new CacheConfig(testPattern);
    config.writeCallback = async () => {
      if (timeOfLastCall) waitTimes.push(new Date - timeOfLastCall);
      timeOfLastCall = new Date();
      if (waitTimes.length < retries) throw new Error();
    };
    config.writeStrategy = WriteStrategies.writeBack;
    config.writeRetryCount = retries;
    config.writeRetryInterval = interval;
    cache.register(config);
    
    await cache.put(testPattern, testValue);
    await new Promise(resolve => setTimeout(resolve, waitFor));

    for (const waitTime of waitTimes) {
      expect(waitTime).toBeGreaterThanOrEqual(interval);
    }
  });


  test("pattern parameters are passed to the callback", async () => {
    const verb = "is";
    const noun = "sentence";
    const testPattern = "this/{verb}/a/test/{noun}";
    const testKey = `this/${verb}/a/test/${noun}`;
    const testValue = "result";
    let paramsReceived = false;

    const config = new CacheConfig(testPattern);
    config.writeCallback = async (context) => { 
      paramsReceived = context.params.verb === verb && context.params.noun === noun;
    };
    config.writeStrategy = WriteStrategies.writeBack;
    cache.register(config);

    await cache.put(testKey, testValue);

    expect(paramsReceived).toEqual(true);
  });
});
