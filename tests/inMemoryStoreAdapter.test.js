import InMemoryStoreAdapter from "../src/inMemoryStoreAdapter";


describe("inMemoryStoreAdapter", () => {
  let store;

  jest.useFakeTimers();

  beforeEach(() => {
    store = new InMemoryStoreAdapter();
  });


  test("stale key-pairs are actively removed", async () => {
    const ttl = 1;

    for (let i = 0; i < 10; i++) {
      const key = `key${i}`;
      store.put(key, i.toString(), ttl);
    }
    
    jest.advanceTimersByTime((ttl * 10 + 1) * 100);

    expect(store.size()).toEqual(0);
  });
});
