import { Race } from '../types';

const DB_NAME = 'MXELODB';
const DB_VERSION = 1;
const STORES = {
  RACES: 'races'
};

let dbConnection: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  if (dbConnection) return Promise.resolve(dbConnection);
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.RACES)) db.createObjectStore(STORES.RACES, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      dbConnection = request.result;
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveRaces = async (races: Race[]) => {
  const db = await initDB();
  const tx = db.transaction(STORES.RACES, 'readwrite');
  const store = tx.objectStore(STORES.RACES);
  store.clear();
  races.forEach(r => store.put(r));
  return new Promise((resolve) => tx.oncomplete = resolve);
};

export const bulkAddRaces = async (newRaces: Race[]) => {
  const db = await initDB();
  const tx = db.transaction(STORES.RACES, 'readwrite');
  const store = tx.objectStore(STORES.RACES);
  newRaces.forEach(r => store.put(r));
  return new Promise((resolve) => tx.oncomplete = resolve);
};

export const getRaces = async (): Promise<Race[]> => {
  const db = await initDB();
  const tx = db.transaction(STORES.RACES, 'readonly');
  const store = tx.objectStore(STORES.RACES);
  const request = store.getAll();
  return new Promise((resolve) => request.onsuccess = () => resolve(request.result));
};