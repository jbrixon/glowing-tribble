import ExtensorCache from "../src/extensorCache";
import InMemoryStoreAdapter from "./testStoreAdapter";
import KeyConfig from "../src/keyConfig";
import WriteStrategies from "../src/writeStrategies";


describe("write-through caching", () => {
  let cache, store;

  beforeEach(() => {
    store = new InMemoryStoreAdapter();
    cache = new ExtensorCache(store);
  });


  test("the write callback is called", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";
    let called = false;

    const config = new KeyConfig(testPattern);
    config.writeCallback = async () => { called = true; };
    config.writeStrategy = WriteStrategies.writeThrough;
    cache.register(config);

    await cache.put(testPattern, testValue);
    
    expect(called).toEqual(true);
  });


  test("the cache is updated when the callback resolves", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";

    const config = new KeyConfig(testPattern);
    config.writeCallback = async () => {};
    config.writeStrategy = WriteStrategies.writeThrough;
    cache.register(config);

    await cache.put(testPattern, testValue);
    const cachedResult = store.get(testPattern);
    
    expect(cachedResult).toEqual(testValue);
  });


  test("the cache is not updated when the callback rejects", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";

    const config = new KeyConfig(testPattern);
    config.writeCallback = async () => {
      throw new Error();
    };
    config.writeStrategy = WriteStrategies.writeThrough;
    cache.register(config);

    store.put(testPattern, testValue);
    try {
      await cache.put(testPattern, "new result");
    } catch (e) {}
    const cachedResult = store.get(testPattern);

    expect(cachedResult).toEqual(testValue);
  });


  test("the promise is rejected when the callback rejects", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";
    const testError = new Error("just a test...");

    const config = new KeyConfig(testPattern);
    config.writeCallback = async () => {
      throw testError;
    };
    config.writeStrategy = WriteStrategies.writeThrough;
    cache.register(config);

    await expect(cache.put(testPattern, testValue)).rejects.toEqual(testError);
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
    config.writeStrategy = WriteStrategies.writeThrough;
    cache.register(config);

    await cache.put(testKey, testValue);

    expect(paramsReceived).toEqual(true);
  });
});
