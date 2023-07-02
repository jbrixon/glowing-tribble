import CacheConfig from "./cacheConfig";
import ExtensorCache from "./extensorCache";
import InMemoryStoreAdapter from "./inMemoryStoreAdapter";
import ReadStrategies from "./readStrategies";
import WriteStrategies from "./writeStrategies";


export default {
  CacheConfig,
  ExtensorCache,
  InMemoryStore: InMemoryStoreAdapter,
  ReadStrategies,
  WriteStrategies,
};
