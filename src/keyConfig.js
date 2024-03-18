import GlobalConfig from "./globalConfig";
import ReadStrategies from "./readStrategies";
import WriteStrategies from "./writeStrategies";

/**
 * @type {KeyConfig}
 */
class KeyConfig extends GlobalConfig {
  /**
   * @param {string} pattern 
   * @param {number} ttl 
   * @param {Callback} readCallback 
   * @param {ReadStrategy} readStrategy 
   * @param {Callback} writeCallback 
   * @param {WriteStrategy} writeStrategy 
   */
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
