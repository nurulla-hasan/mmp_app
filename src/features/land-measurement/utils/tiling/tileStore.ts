import {
  TILE_DB_NAME,
  TILE_STORE_NAME,
  TILE_DB_VERSION,
} from './types';

/** Cached IndexedDB connection. */
let _dbPromise: Promise<IDBDatabase> | null = null;

/** Open (or reuse) the IndexedDB connection. */
function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(TILE_DB_NAME, TILE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TILE_STORE_NAME)) {
        // Key path: [imageHash, level, row, col] — stored as a single string
        const store = db.createObjectStore(TILE_STORE_NAME, { keyPath: 'id' });
        store.createIndex('imageHash', 'imageHash', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { _dbPromise = null; reject(req.error); };
    req.onblocked = () => { _dbPromise = null; };
  });
  // Reset cache on unexpected close (e.g. DB deleted or version changed externally)
  _dbPromise.then((db) => {
    db.onclose = () => { _dbPromise = null; };
    db.onversionchange = () => { db.close(); _dbPromise = null; };
  });
  return _dbPromise;
}

// ── Tile Storage ──

export interface TileRecord {
  id: string; // `${imageHash}:${level}:${row}:${col}`
  imageHash: string;
  level: number;
  row: number;
  col: number;
  blob: Blob;
  timestamp: number; // Date.now()
}

function tileId(hash: string, level: number, row: number, col: number): string {
  return `${hash}:${level}:${row}:${col}`;
}

export async function putTile(
  hash: string,
  level: number,
  row: number,
  col: number,
  blob: Blob,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(TILE_STORE_NAME);
    store.put({
      id: tileId(hash, level, row, col),
      imageHash: hash,
      level,
      row,
      col,
      blob,
      timestamp: Date.now(),
    });
    tx.oncomplete = () => { resolve(); };
    tx.onerror = () => { reject(tx.error); };
  });
}

export async function getTile(
  hash: string,
  level: number,
  row: number,
  col: number,
): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE_NAME, 'readonly');
    const store = tx.objectStore(TILE_STORE_NAME);
    const req = store.get(tileId(hash, level, row, col));
    req.onsuccess = () => {
      resolve(req.result?.blob ?? null);
    };
    req.onerror = () => { reject(req.error); };
  });
}

export async function hasTile(
  hash: string,
  level: number,
  row: number,
  col: number,
): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE_NAME, 'readonly');
    const store = tx.objectStore(TILE_STORE_NAME);
    const req = store.count(tileId(hash, level, row, col));
    req.onsuccess = () => { resolve(req.result > 0); };
    req.onerror = () => { reject(req.error); };
  });
}

// ── Bulk Operations ──

/** Check if ALL tiles for a given hash+level exist. */
export async function hasLevelTiles(
  hash: string,
  level: number,
  rows: number,
  cols: number,
): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE_NAME, 'readonly');
    const store = tx.objectStore(TILE_STORE_NAME);
    const index = store.index('imageHash');
    const range = IDBKeyRange.only(hash);
    const req = index.openCursor(range);
    let count = 0;
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const record = cursor.value as TileRecord;
        if (record.level === level) count++;
        cursor.continue();
      } else {
        resolve(count >= rows * cols);
      }
    };
    req.onerror = () => { reject(req.error); };
  });
}

/** Get count of tiles stored for a given image. */
export async function getTileCount(hash: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE_NAME, 'readonly');
    const store = tx.objectStore(TILE_STORE_NAME);
    const index = store.index('imageHash');
    const req = index.count(IDBKeyRange.only(hash));
    req.onsuccess = () => { resolve(req.result); };
    req.onerror = () => { reject(req.error); };
  });
}

/** Remove ALL tiles for a given image hash. */
export async function clearTiles(hash: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(TILE_STORE_NAME);
    const index = store.index('imageHash');
    const range = IDBKeyRange.only(hash);
    const req = index.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => { resolve(); };
    tx.onerror = () => { reject(tx.error); };
  });
}


/** Remove old tiles (older than TTL). Call on init. */
export async function clearOldTiles(ttlMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  const cutoff = Date.now() - ttlMs;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(TILE_STORE_NAME);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(cutoff);
    const req = index.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => { resolve(); };
    tx.onerror = () => { reject(tx.error); };
  });
}
