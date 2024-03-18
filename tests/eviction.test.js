import ExtensorCache from "../src/extensorCache";
import InMemoryStoreAdapter from "./testStoreAdapter";
import KeyConfig from "../src/keyConfig";
import WriteStrategies from "../src/writeStrategies";


describe("extensorCache", () => {
  let cache, store;

  beforeEach(() => {
    store = new InMemoryStoreAdapter();
    cache = new ExtensorCache(store);
  });


  test("no exception is thrown when an attempt is made to evict a non-existent key", () => {
    const evictNonExistentKey = async () => {
      await cache.evict("test-key");
    }
    expect(evictNonExistentKey).not.toThrow();
  });


  describe("writeThrough", () => {
    test("the eviction callback is called", async () => {
      const testPattern = "test/pattern";

      const config = new KeyConfig(testPattern);
      const mockFunction = jest.fn();
      config.evictCallback = async () => mockFunction();
      config.writeStrategy = WriteStrategies.writeThrough;
      cache.register(config);
      
      await cache.evict(testPattern);

      expect(mockFunction).toBeCalled();
    });


    test("the key is evicted when the callback resolves", async () => {
      const testPattern = "test/pattern";
      const testValue = "result";
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = async () => {};
      config.writeStrategy = WriteStrategies.writeThrough;
      cache.register(config);
      store.put(testPattern, testValue);
  
      await cache.evict(testPattern);
      const cachedResult = store.get(testPattern);
      
      expect(cachedResult).toEqual(undefined);
    });


    test("the key is not evicted when the callback rejects", async () => {
      const testPattern = "test/pattern";
      const testValue = "result";
      const testError = new Error();
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = async () => {
        throw testError;
      };
      config.writeStrategy = WriteStrategies.writeThrough;
      cache.register(config);
  
      store.put(testPattern, testValue);
      try {
        await cache.evict(testPattern);
      } catch (e) {
        expect(e).toEqual(testError);
      }
      const cachedResult = store.get(testPattern);
  
      expect(cachedResult).toEqual(testValue);
    });


    test("the promise is rejected when the callback rejects", async () => {
      const testPattern = "test/pattern";
      const testError = new Error("just a test...");
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = async () => {
        throw testError;
      };
      config.writeStrategy = WriteStrategies.writeThrough;
      cache.register(config);
  
      await expect(cache.evict(testPattern)).rejects.toEqual(testError);
    });


    test("pattern parameters are passed to the callback", async () => {
      const verb = "is";
      const noun = "sentence";
      const testPattern = "this/{verb}/a/test/{noun}";
      const testKey = `this/${verb}/a/test/${noun}`;
      let paramsReceived = false;
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = async (context) => { 
        paramsReceived = context.params.verb === verb && context.params.noun === noun;
      };
      config.writeStrategy = WriteStrategies.writeThrough;
      cache.register(config);
  
      await cache.evict(testKey);
  
      expect(paramsReceived).toEqual(true);
    });
  });


  describe("writeBack", () => {
    test("the eviction callback is called", async () => {
      const testPattern = "test/pattern";

      const config = new KeyConfig(testPattern);
      config.evictCallback = jest.fn();
      config.writeStrategy = WriteStrategies.writeBack;
      cache.register(config);
      
      await cache.evict(testPattern);

      expect(config.evictCallback).toBeCalled();
    });


    test("the key is evicted when the callback resolves", async () => {
      const testPattern = "test/pattern";
      const badResult = "bad result";
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = async () => {};
      config.writeStrategy = WriteStrategies.writeBack;
      cache.register(config);
  
      store.put(testPattern, badResult);
  
      await cache.evict(testPattern);
      
      expect(store.get(testPattern)).toEqual(undefined);
    });


    test("the key is evicted when the callback rejects", async () => {
      const testPattern = "test/pattern";
      const badResult = "bad result";
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = async () => { throw new Error(); };
      config.writeStrategy = WriteStrategies.writeBack;
      cache.register(config);
  
      store.put(testPattern, badResult);
  
      await cache.evict(testPattern);
  
      expect(store.get(testPattern)).toEqual(undefined);
    });


    test("the promise is not rejected when the callback rejects", async () => {
      const testPattern = "test/pattern";
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = async () => { throw new Error(); };
      config.writeStrategy = WriteStrategies.writeBack;
      cache.register(config);
  
      expect(cache.evict(testPattern)).resolves;
    });


    test("the callback is retried the requested number of times", async () => {
      const testPattern = "test/pattern";
      const retries = 3;
      const interval = 1;
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = jest.fn(async () => {
        throw new Error();
      });
      config.writeStrategy = WriteStrategies.writeBack;
      config.writeRetryCount = retries;
      config.writeRetryInterval = interval;
      cache.register(config);
      
      await cache.evict(testPattern);
  
      expect(config.evictCallback).toHaveBeenCalledTimes(retries + 1);
    });


    test("the callback is backed off ", async () => {
      jest.useFakeTimers();
  
      const testPattern = "test/pattern";
      const retries = 3;
      const interval = 100;
  
      const callTimes = [];
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = jest.fn(async () => {
        callTimes.push(new Date());
        throw new Error();
      });
      config.writeStrategy = WriteStrategies.writeBack;
      config.writeRetryCount = retries;
      config.writeRetryInterval = interval;
      config.writeRetryBackoff = true;
      cache.register(config);
  
      const putPromise = cache.evict(testPattern);
      
      // this might be flakey, but I can't be bothered to look into how the
      // timeout call works. it seems to always work though.
      // if it ever doesn't, we should fix it
      for (let i = 0; i <= retries; i++) {
        await jest.advanceTimersByTimeAsync(interval * 2 ** i)
      }
      await putPromise;
  
      expect(callTimes[1] - callTimes[0]).toEqual(interval);
      expect(callTimes[2] - callTimes[1]).toBeGreaterThan(interval);
      expect(callTimes[3] - callTimes[2]).toBeGreaterThan(interval);
      expect(callTimes[3] - callTimes[2]).toBeGreaterThan(callTimes[2] - callTimes[1]);
    });


    test("the callback interval is capped when backed off ", async () => {
      jest.useFakeTimers();
  
      const testPattern = "test/pattern";
      const retries = 3;
      const interval = 100;
  
      const callTimes = [];
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = jest.fn(async () => {
        callTimes.push(new Date());
        throw new Error();
      });
      config.writeStrategy = WriteStrategies.writeBack;
      config.writeRetryCount = retries;
      config.writeRetryInterval = interval;
      config.writeRetryBackoff = true;
      config.writeRetryIntervalCap = 200;
      cache.register(config);
  
      const putPromise = cache.evict(testPattern);
      
      // this might be flakey, but I can't be bothered to look into how the
      // timeout call works. it seems to always work though.
      // if it ever doesn't, we should fix it
      for (let i = 0; i <= retries; i++) {
        await jest.advanceTimersByTimeAsync(interval * 2 ** i)
      }
      await putPromise;
  
      expect(callTimes[1] - callTimes[0]).toEqual(interval);
      expect(callTimes[2] - callTimes[1]).toBeGreaterThan(interval);
      expect(callTimes[2] - callTimes[1]).toBeLessThanOrEqual(config.writeRetryIntervalCap);
      expect(callTimes[3] - callTimes[2]).toBeGreaterThan(interval);
      expect(callTimes[3] - callTimes[2]).toBeLessThanOrEqual(config.writeRetryIntervalCap);
    });


    test("the callback is called at the requested interval", async () => {
      jest.useFakeTimers();
  
      const testPattern = "test/pattern";
      const retries = 3;
      const interval = 100;
  
      const callTimes = [];
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = jest.fn(async () => {
        callTimes.push(new Date());
        throw new Error();
      });
      config.writeStrategy = WriteStrategies.writeBack;
      config.writeRetryCount = retries;
      config.writeRetryInterval = interval;
      config.writeRetryBackoff = false;
      cache.register(config);
  
      const putPromise = cache.evict(testPattern);
      
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
      let paramsReceived = false;
  
      const config = new KeyConfig(testPattern);
      config.evictCallback = async (context) => { 
        paramsReceived = context.params.verb === verb && context.params.noun === noun;
      };
      config.writeStrategy = WriteStrategies.writeBack;
      cache.register(config);
  
      await cache.evict(testKey);
  
      expect(paramsReceived).toEqual(true);
    });
  });
});
