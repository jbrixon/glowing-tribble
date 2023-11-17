import ExtensorCache from "../src/extensorCache";
import InMemoryStoreAdapter from "./testStoreAdapter";
import KeyConfig from "../src/keyConfig";
import WriteStrategies from "../src/writeStrategies";


describe("updating", () => {
  let cache, store;

  beforeEach(() => {
    store = new InMemoryStoreAdapter();
    cache = new ExtensorCache(store);
  });


  test("the update callback is called if a value is set and a callback given", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";
    let called = false;

    store.put(testPattern, "initial");
    const config = new KeyConfig(testPattern);
    config.updateCallback = async () => { called = true; };
    config.writeStrategy = WriteStrategies.writeThrough;
    cache.register(config);

    await cache.update(testPattern, testValue);
    
    expect(called).toEqual(true);
  });


  test("the write callback is called if no update callback is set", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";
    let called = false;

    const config = new KeyConfig(testPattern);
    config.writeCallback = async () => { called = true; };
    config.writeStrategy = WriteStrategies.writeThrough;
    cache.register(config);

    await cache.update(testPattern, testValue);
    
    expect(called).toEqual(true);
  });


  test("the cache is updated when the callback resolves", async () => {
    const testPattern = "test/pattern";
    const updatedValue = "updated";
    const initialValue = "initial"

    store.put(testPattern, initialValue);
    const config = new KeyConfig(testPattern);
    config.updateCallback = async () => {};
    config.writeStrategy = WriteStrategies.writeThrough;
    cache.register(config);

    await cache.update(testPattern, updatedValue);
    const cachedResult = store.get(testPattern);
    
    expect(cachedResult).toEqual(updatedValue);
  });


  test("pattern parameters are passed to the callback", async () => {
    const verb = "is";
    const noun = "sentence";
    const testPattern = "this/{verb}/a/test/{noun}";
    const testKey = `this/${verb}/a/test/${noun}`;
    const testValue = "result";
    let paramsReceived = false;

    store.put(testKey, testValue);
    const config = new KeyConfig(testPattern);
    config.updateCallback = async (context) => { 
      paramsReceived = context.params.verb === verb && context.params.noun === noun;
    };
    config.writeStrategy = WriteStrategies.writeThrough;
    cache.register(config);

    await cache.update(testKey, testValue);

    expect(paramsReceived).toEqual(true);
  });


  test("the cache is not updated when the callback rejects", async () => {
    const testPattern = "test/pattern";
    const badResult = "bad";
    const goodResult = "result";

    store.put(testPattern, badResult);
    const config = new KeyConfig(testPattern);
    config.updateCallback = async () => {
      throw new Error();
    };
    config.writeStrategy = WriteStrategies.writeThrough;
    cache.register(config);

    store.put(testPattern, goodResult);
    try {
      await cache.update(testPattern, "new result");
    } catch (e) {}
    const cachedResult = store.get(testPattern);

    expect(cachedResult).toEqual(goodResult);
  });


  test("the promise is rejected when the callback rejects", async () => {
    const testPattern = "test/pattern";
    const initialValue = "test";
    const testValue = "result";
    const testError = new Error("just a test...");

    store.put(testPattern, initialValue)
    const config = new KeyConfig(testPattern);
    config.updateCallback = async () => {
      throw testError;
    };
    config.writeStrategy = WriteStrategies.writeThrough;
    cache.register(config);

    await expect(cache.update(testPattern, testValue)).rejects.toEqual(testError);
  });
});
