# extensor-cache-js
Extensor cache is a very simple, non-persistent application layer caching library, originally written for [Extensor](https://www.extensor.app), which helps to improve resiliency when you're doing read/write over a network.

Extensor cache takes a callback and handles the caching logic, so you don't have to switch on your brain. A lot of the examples here refer to HTTP requests, but you can use it for any form of IO, as long as there is an async function to handle it.

Out of the box, it can handle various read/write strategies:
- read-through
- read-around
- write-through
- write-back

See below for more about when and how to use those.

---
## Usage
Install Extensor cache with your favourite package manager. I use npm cos I'm *cool* like that.
```shell
npm i extensor-cache
```
Instantiate an ExtensorCache object and configure a key pattern to start caching fetched and written values. 

When fetching data, return it from an async callback to cache it:
```javascript
import {
  ExtensorCache,
  InMemoryStore,
  CacheConfig,
} from "extensor-cache";

const cache = new ExtensorCache(new InMemoryStore());
const config = new CacheConfig("examples/{exampleName}/objects/{object}");
config.readCallback = async (context) => {
  return await someLongRunningFetch(context.params.exampleName, context.params.object);
}
cache.register(config);

const value = await cache.get("examples/readme/objects/usage");
console.log(value); // result of someLongRunningFetch("readme", "usage")
```
---
## Key patterns
Key patterns idenfity cached variables. Extensor cache supports both static and dynamic key patterns. Key patterns can be used to identify values that are always fetched by the same callback. Dynamic key patterns contain parameters, whereas static patterns do not.

### Static patterns
```javascript
// ...
const config = new CacheConfig("examples/readme");
config.readCallback = async () => {
  return await someLongRunningFetch("https://example.com/some-fixed-endpoint");
}
cache.register(config);
```

### Dynamic patterns
Parameters can be added to key patterns by wrapping them in curly brackets. The string inside the curly brackets is used to name the parameter. Parameters can be accessed inside the callback via the `context` object that is passed:
```javascript
// ...
const config = new CacheConfig("examples/{exampleName}/objects/{object}");
config.readCallback = async (context) => {
  // here we have access to
  //   - context.params.exampleName
  //   - context.params.object
  return await someLongRunningFetch(
    context.params.exampleName, 
    context.params.object
  );
}
cache.register(config);
```

---
## Cache Configuration
###### ttl
```javascript
const config = new CacheConfig("examples/{exampleName}");
config.ttl = 600; // time in seconds for the cache entry to live
cache.register(config);

```
###### readCallback
```javascript
const config = new CacheConfig("examples/{exampleName}");
config.readCallback = async (context) => {
  // the callback to run when a read is requested.
  // throw an error if the read was unsuccessful.
  // on success, this callback should return the value to be cached.
};
cache.register(config);

```
###### readStrategy
```javascript
import { ReadStrategies } from "extensor-cache";

const config = new CacheConfig("examples/{exampleName}");
config.readStrategy = ReadStrategies.readThrough; 
// Tells the cache which read strategy to use for this pattern.
// Should be something imported from ReadStrategies.
// Any other value will cause cache-only to be used.
// Default is cache-only.
cache.register(config);

```
###### writeCallback
```javascript
const config = new CacheConfig("examples/{exampleName}");
config.writeCallback = async (context) => {
  // the callback to run when a write is triggered.
  // throw an error if the write does not complete. 
  // if no error is thrown, the write will be considered successful.
  // this callback shouldn't return anything.

  // bear in mind that the error will not make it to the calling 
  // context if the  write strategy is write-back.
};
cache.register(config);

```
###### writeStrategy
```javascript
import { WriteStrategies } from "extensor-cache";

const config = new CacheConfig("examples/{exampleName}");
config.writeStrategy = WriteStrategies.writeThrough; 
// Tells the cache which write strategy to use for this pattern.
// Should be something imported from WriteStrategies.
// Any other value will cause cache-only to be used.
// Default is cache-only.
cache.register(config);

```
###### writeRetryCount
```javascript
const config = new CacheConfig("examples/{exampleName}");
config.writeCallback = async (context) => {
  return await someLongRunningFetch(context.params.exampleName);
};
config.writeStrategy = WriteStrategies.writeBehind; 
// retries the callback up to 4 further times if the initial attempt fails.
// only valid when writeStrategy is write-behind.
// default is 1 retry.
config.writeRetryCount = 4; 
cache.register(config);

```
###### writeRetryInterval
```javascript
const config = new CacheConfig("examples/{exampleName}");
config.writeCallback = async (context) => {
  return await someLongRunningFetch(context.params.exampleName);
};
config.writeRetryInterval = 3000; // waits 3000ms before retrying the write callback.
cache.register(config);

```

---
## Examples

---
## Strategies
### Read Strategies
#### Read-Through
`ReadStrategies.readThrough`
Use this if your read target is slow-changing. It will read cache first and only call the callback on a cache miss.
#### Read-Behind
`ReadStrategies.readAround`
Use this if your read target is fast-changing. It will call the callback first and only go to cache if the callback returns a rejected Promise.
### Write Strategies
#### Write-Through
`WriteStrategies.writeThrough`
Use this if you care about consistency. It will only update the cache if the callback is successful.

#### Write-Back
`WriteStrategies.writeBack`
Use this if you don't care about consistency. It will update the cache, return, then call the callback in the background. Retrying the callback can be configured, but will fail quietly when the retry limit is reached.

---
## Options


---
## Roll your own store
Go crazy. Check `src/inMemoryStoreAdapter.js` to get an idea of the necessary interface, then pass that to the cache at instantation.

---
## Testing
Run:
```shell
npm test
```
