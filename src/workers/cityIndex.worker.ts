import FlexSearch, { type Index } from "flexsearch";

const DB_NAME = "city-index";
const STORE_NAME = "index";
const INDEX_KEY = "locations-cache";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveIndex(index: Index) {
  const db = await openDB();

  const chunks: Record<string, string> = {};

  await new Promise<void>((resolve) => {
    index.export((key, data) => {
      chunks[key] = data;
    });

    resolve();
  });

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).put(chunks, INDEX_KEY);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function loadIndex(): Promise<Record<string, string> | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(INDEX_KEY);

    request.onsuccess = () => { resolve(request.result ?? null) };
    request.onerror = () => reject(request.error);
  });
}

async function restoreIndex(index: Index) {
  const chunks = await loadIndex();

  if (!chunks) return false;

  for (const [key, data] of Object.entries(chunks)) {
    index.import(key, data);
  }

  return true;
}

let index: Index | undefined;

self.onmessage = async (event) => {
  try {
    switch (event.data.type) {
      case "init":
        await initialise();
        break;

      case "search":
        search(
          event.data.id,
          event.data.query,
          event.data.limit ?? 10,
        );
        break;
    }
  } catch (error) {
    postMessage({
      type: "error",
      error: error instanceof Error
        ? error.message
        : String(error),
    });
  }
};

async function initialise() {
  index = new FlexSearch.Index({
    preset: "performance",
    tokenize: "full",
    encoder: "LatinAdvanced",
    resolution: 9,
    cache: true,
  });

  postMessage({
    type: "status",
    status: "loading-index",
  });

  const restored = await restoreIndex(index);

  if (restored) {
    console.log("Index restored from IndexedDB");

    postMessage({
      type: "status",
      status: "ready",
      progress: 100,
    });

    return;
  }

  postMessage({
    type: "status",
    status: "loading-data",
    progress: 0,
  });

  const { default: locations } =
    await import("../data/countries+cities.json");

  postMessage({
    type: "status",
    status: "building-index",
    progress: 0,
  });

  const totalCities = locations.reduce(
    (total, { c }) => total + c.length,
    0,
  );

  let processed = 0;

  for (const { c: cities, n: country } of locations) {
    for (const city of cities) {
      index.add(`${country}:${city}`, city);

      processed++;

      if (processed % 1000 === 0) {
        postMessage({
          type: "status",
          status: "building-index",
          progress: Math.round(
            (processed / totalCities) * 100,
          ),
        });
      }
    }
  }

  postMessage({
    type: "status",
    status: "persisting",
    progress: 0,
  });

  await saveIndex(index);

  postMessage({
    type: "status",
    status: "ready",
    progress: 100,
  });
}

function search(
  id: number,
  query: string,
  limit: number,
) {
  if (!index) {
    postMessage({
      type: "error",
      error: "Index not initialized",
    });

    return;
  }

  const results = index.search(query, { limit });

  postMessage({
    type: "search-results",
    id,
    results,
  });
}