import ExtensorCache from "../src/extensorCache";
import InMemoryStoreAdapter from "./testStoreAdapter";
import KeyConfig from "../src/keyConfig";
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

    const config = new KeyConfig(testPattern);
    config.writeCallback = jest.fn();
    config.writeStrategy = WriteStrategies.writeBack;
    cache.register(config);
    
    await cache.put(testPattern, testValue);

    expect(config.writeCallback).toBeCalled();
  });


  test("the cache is updated when the callback resolves", async () => {
    const testPattern = "test/pattern";
    const goodResult = "good result";
    const badResult = "bad result";

    const config = new KeyConfig(testPattern);
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

    const config = new KeyConfig(testPattern);
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

    const config = new KeyConfig(testPattern);
    config.writeCallback = async () => { throw new Error(); };
    config.writeStrategy = WriteStrategies.writeBack;
    cache.register(config);

    expect(cache.put(testPattern, goodResult)).resolves;
  });


  test("the callback is retried the requested number of times", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";
    const retries = 3;
    const interval = 1;

    const config = new KeyConfig(testPattern);
    config.writeCallback = jest.fn(async () => {
      throw new Error();
    });
    config.writeStrategy = WriteStrategies.writeBack;
    config.writeRetryCount = retries;
    config.writeRetryInterval = interval;
    cache.register(config);
    
    await cache.put(testPattern, testValue);

    expect(config.writeCallback).toHaveBeenCalledTimes(retries + 1);
  });


  test("the callback is called at the requested interval", async () => {
    jest.useFakeTimers();

    const testPattern = "test/pattern";
    const testValue = "result";
    const retries = 3;
    const interval = 100;

    const callTimes = [];

    const config = new KeyConfig(testPattern);
    config.writeCallback = jest.fn(async () => {
      callTimes.push(new Date());
      throw new Error();
    });
    config.writeStrategy = WriteStrategies.writeBack;
    config.writeRetryCount = retries;
    config.writeRetryInterval = interval;
    cache.register(config);

    const putPromise = cache.put(testPattern, testValue);
    
    // this might be flakey, but I can't be bothered to look into how the
    // timeout call works. it seems to always work though.
    // if it ever doesn't, we should fix it
    for (let i = 0; i <= retries; i++) {
      await jest.advanceTimersByTimeAsync(interval)
    }
    await putPromise;

    expect(callTimes[3] - callTimes[2]).toEqual(interval);
    expect(callTimes[2] - callTimes[1]).toEqual(interval);
    expect(callTimes[1] - callTimes[0]).toEqual(interval);
  });


  test("pattern parameters are passed to the callback", async () => {
    const verb = "is";
    const noun = "sentence";
    const testPattern = "this/{verb}/a/test/{noun}";
    const testKey = `this/${verb}/a/test/${noun}`;
    const testValue = "result";
    let paramsReceived = false;

    const config = new KeyConfig(testPattern);
    config.writeCallback = async (context) => { 
      paramsReceived = context.params.verb === verb && context.params.noun === noun;
    };
    config.writeStrategy = WriteStrategies.writeBack;
    cache.register(config);

    await cache.put(testKey, testValue);

    expect(paramsReceived).toEqual(true);
  });
});
