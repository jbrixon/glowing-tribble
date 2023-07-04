import ExtensorCache from "../src/extensorCache";
import InMemoryStoreAdapter from "../src/inMemoryStoreAdapter";
import KeyConfig from "../src/keyConfig";
import ReadStrategies from "../src/readStrategies";


describe("read-through caching", () => {
  let cache, store;
  jest.useFakeTimers();

  beforeEach(() => {
    store = new InMemoryStoreAdapter();
    cache = new ExtensorCache(store);
  });


  test("get returns cached value on cache hit", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";
    
    const config = new KeyConfig(testPattern);
    config.readCallback = async () => {};
    config.readStrategy = ReadStrategies.readThrough;
    cache.register(config);

    store.put(testPattern, testValue);
    const result = await cache.get(testPattern);

    expect(result).toEqual(testValue);
  });


  test("get returns result of callback on cache miss", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";

    const config = new KeyConfig(testPattern);
    config.readCallback = async () => { return testValue; };
    config.readStrategy = ReadStrategies.readThrough;
    cache.register(config);
      
    const result = await cache.get(testPattern);

    expect(result).toEqual(testValue);
  });


  test("cache is updated after cache miss and callback", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";

    const config = new KeyConfig(testPattern);
    config.readCallback = async () => { return testValue; };
    config.readStrategy = ReadStrategies.readThrough;
    cache.register(config);

    await cache.get(testPattern);

    expect(store.get(testPattern)).toEqual(testValue);
  });


  test("pattern parameters are passed to read callbacks", async () => {
    const verb = "is";
    const noun = "sentence";
    const testPattern = "this/{verb}/a/test/{noun}";
    const testKey = `this/${verb}/a/test/${noun}`;
    let paramsReceived = false;

    const config = new KeyConfig(testPattern);
    config.readCallback = async (context) => { 
      paramsReceived = context.params.verb === verb && context.params.noun === noun;
    };
    config.readStrategy = ReadStrategies.readThrough;
    cache.register(config);

    await cache.get(testKey);

    expect(paramsReceived).toEqual(true);
  });
});
