import GlobalConfig from "./globalConfig";
import ReadStrategies from "./readStrategies";
import WriteStrategies from "./writeStrategies";


class KeyConfig extends GlobalConfig {
  constructor(pattern, ttl=0, readCallback=()=>{}, readStrategy=ReadStrategies.cacheOnly, writeCallback=()=>{}, writeStrategy=WriteStrategies.cacheOnly) {
    super(ttl, readStrategy, writeStrategy);
    this.pattern = pattern;
    this.readCallback = readCallback;
    this.writeCallback = writeCallback;
    this.evictCallback = () => {};
    this.updateCallback = undefined;
  }
}


export default KeyConfig;
