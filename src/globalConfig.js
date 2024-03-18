import ReadStrategies from "./readStrategies";
import WriteStrategies from "./writeStrategies";


class GlobalConfig {
  constructor(ttl=0, readStrategy=ReadStrategies.cacheOnly, writeStrategy=WriteStrategies.cacheOnly) {
    this.ttl = ttl;
    this.readStrategy = readStrategy;
    this.writeStrategy = writeStrategy;
    this.writeRetryCount = 1;
    this.writeRetryInterval = 1000;
    this.writeRetryBackoff = true;
    this.writeRetryIntervalCap = 60 * 60 * 1000;  // 1hr
  }
}


export default GlobalConfig;
