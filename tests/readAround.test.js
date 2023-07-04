import ExtensorCache from "../src/extensorCache";
import InMemoryStoreAdapter from "../src/inMemoryStoreAdapter";
import KeyConfig from "../src/keyConfig";
import ReadStrategies from "../src/readStrategies";


describe("read-around caching", () => {
  let cache, store;

  beforeEach(() => {
    store = new InMemoryStoreAdapter();
    cache = new ExtensorCache(store);
  });


  test("get returns callback value if callback resolves", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";

    const config = new KeyConfig(testPattern);
    config.readCallback = async () => { return testValue; };
    config.readStrategy = ReadStrategies.readAround;
    cache.register(config);

    store.put(testPattern, "not the right result");

    const result = await cache.get(testPattern);
    expect(result).toEqual(testValue);
  });


  test("get returns cached result if callback rejects", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";

    const config = new KeyConfig(testPattern);
    config.readCallback = async () => { throw new Error(); };
    config.readStrategy = ReadStrategies.readAround;
    cache.register(config);

    store.put(testPattern, testValue);

    const result = await cache.get(testPattern);
    expect(result).toEqual(testValue);
  });


  test("cache is updated after each resolved callback", async () => {
    const testPattern = "test/pattern";
    const testValue = "result";
    
    const config = new KeyConfig(testPattern);
    config.readCallback = async () => { return testValue; };
    config.readStrategy = ReadStrategies.readAround;
    cache.register(config);

    store.put(testPattern, "not the right result");

    await cache.get(testPattern);
    const cachedValue = store.get(testPattern);
    expect(cachedValue).toEqual(testValue);
  });


  test("an exception is thrown if the callback rejects and cache miss", async () => {
    expect.assertions(1);
    const testPattern = "test/pattern";
    const errorMessage = "Test failure"

    const config = new KeyConfig(testPattern);
    config.readCallback = async () => { throw new Error(errorMessage); };
    config.readStrategy = ReadStrategies.readAround;
    cache.register(config);

    await expect(cache.get(testPattern)).rejects.toEqual(
      new Error(`Read callback for key ${testPattern} failed due to Error: ${errorMessage}. The key was not found in the cache.`)
    );
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
    config.readStrategy = ReadStrategies.readAround;
    cache.register(config);

    await cache.get(testKey);

    expect(paramsReceived).toEqual(true);
  });
});
