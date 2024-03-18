/**
 * @typedef {object} GlobalConfig
 * @property {number} ttl
 * @property {ReadStrategy} readStrategy
 * @property {WriteStrategy} writeStrategy
 * @property {number} writeRetryCount
 * @property {number} writeRetryInterval
 * @property {boolean} writeRetryBackoff
 * @property {number} writeRetryIntervalCap
 */

/**
 * @typedef {object} KeyConfig
 * @augments GlobalConfig
 * @property {string} pattern
 * @property {Callback} readCallback
 * @property {Callback} writeCallback
 * @property {Callback} evictCallback
 * @property {Callback} updateCallback
 */

/**
 * @typedef {"CACHE_ONLY" | "READ_THROUGH" | "READ_AROUND"} ReadStrategy
 */

/**
 * @typedef {"CACHE_ONLY" | "WRITE_THROUGH" | "WRITE_BACK"} WriteStrategy
 */

/**
 * @typedef {object} RouteContext
 * @property {KeyConfig} keyConfig
 * @property {object} context
 */

/**
 * @callback Callback
 * @param {RouteContext} context
 */