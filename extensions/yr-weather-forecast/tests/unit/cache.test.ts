import { getCached, setCached, removeCached, clearCachedByPrefix, clearAllCached } from "../../src/cache";
import { LocalStorage } from "@raycast/api";

const store = (LocalStorage as unknown as { _store: Record<string, string> })._store;

beforeEach(async () => {
  // Clear the in-memory store and reset all mock call histories.
  for (const k of Object.keys(store)) delete store[k];
  jest.clearAllMocks();
});

describe("getCached / setCached", () => {
  it("round-trips a stored value", async () => {
    await setCached("myKey", { hello: "world" });
    const result = await getCached<{ hello: string }>("myKey", 60_000);
    expect(result).toEqual({ hello: "world" });
  });

  it("returns undefined for a missing key", async () => {
    expect(await getCached("no-such-key", 60_000)).toBeUndefined();
  });

  it("returns undefined when TTL has expired", async () => {
    // Write an entry with a very old timestamp directly into the store.
    const expiredEntry = JSON.stringify({ savedAtMs: Date.now() - 100_000, value: "stale" });
    store["cache:expiredKey"] = expiredEntry;

    const result = await getCached<string>("expiredKey", 50_000); // TTL 50s < 100s age
    expect(result).toBeUndefined();
  });

  it("returns value within TTL", async () => {
    await setCached("freshKey", 42);
    const result = await getCached<number>("freshKey", 60_000);
    expect(result).toBe(42);
  });

  it("returns undefined for corrupt JSON in storage", async () => {
    store["cache:corruptKey"] = "not-valid-json{{";
    expect(await getCached("corruptKey", 60_000)).toBeUndefined();
  });
});

describe("removeCached", () => {
  it("deletes the entry and getCached returns undefined afterwards", async () => {
    await setCached("deleteMe", "bye");
    await removeCached("deleteMe");
    expect(await getCached<string>("deleteMe", 60_000)).toBeUndefined();
  });

  it("does not throw when removing a non-existent key", async () => {
    await expect(removeCached("ghost")).resolves.toBeUndefined();
  });
});

describe("clearCachedByPrefix", () => {
  it("removes only keys matching the prefix", async () => {
    await setCached("weather:oslo", "sunny");
    await setCached("weather:bergen", "rainy");
    await setCached("sunrise:oslo", "06:30");

    const removed = await clearCachedByPrefix("weather:");
    expect(removed).toBe(2);

    expect(await getCached<string>("weather:oslo", 60_000)).toBeUndefined();
    expect(await getCached<string>("weather:bergen", 60_000)).toBeUndefined();
    // Non-matching key survives
    expect(await getCached<string>("sunrise:oslo", 60_000)).toBe("06:30");
  });
});

describe("clearAllCached", () => {
  it("removes all cache: entries", async () => {
    await setCached("a", 1);
    await setCached("b", 2);

    const removed = await clearAllCached();
    expect(removed).toBe(2);

    expect(await getCached<number>("a", 60_000)).toBeUndefined();
    expect(await getCached<number>("b", 60_000)).toBeUndefined();
  });

  it("does not remove non-cache: keys in LocalStorage", async () => {
    await setCached("cached", "yes");
    // Put a non-cache key directly in the store (simulating unrelated LocalStorage use)
    store["favorites"] = JSON.stringify([]);

    await clearAllCached();

    // The favorites key should survive
    expect(store["favorites"]).toBeDefined();
  });
});
