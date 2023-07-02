import ReadStrategies from "./readStrategies";
import WriteStrategies from "./writeStrategies";


class CacheConfig {
  constructor(pattern, ttl=600, readCallback=()=>{}, readStrategy=ReadStrategies.readThrough, writeCallback=()=>{}, writeStrategy=WriteStrategies.writeThrough) {
    this.pattern = pattern;
    this.ttl = ttl;
    this.readCallback = readCallback;
    this.readStrategy = readStrategy;
    this.writeCallback = writeCallback;
    this.writeStrategy = writeStrategy;
    this.writeRetryCount = 1;
    this.writeRetryInterval = 1000;
  }
}


export default CacheConfig;
