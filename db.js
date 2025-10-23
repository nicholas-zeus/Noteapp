// db.js
const DB_NAME = 'notes_app_db';
const DB_VERSION = 2;
const STORE_NOTES = 'notes';
const STORE_CATEGORIES = 'categories';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Notes store
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const notes = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
        notes.createIndex('updatedAt', 'updatedAt');
        notes.createIndex('primaryCategoryId', 'primaryCategoryId');
      }
      
      // Categories store
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        const cats = db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
        cats.createIndex('name', 'name', { unique: false });
      }
    };
    
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

/* ---------- NOTES ---------- */
export async function saveNote(note) {
  const db = await openDB();
  note.updatedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readwrite');
    tx.oncomplete = () => resolve(note);
    tx.onerror = (e) => reject(e.target.error);
    tx.objectStore(STORE_NOTES).put(note);
  });
}

export async function getNote(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readonly');
    const req = tx.objectStore(STORE_NOTES).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function listNotes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readonly');
    const req = tx.objectStore(STORE_NOTES).getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.updatedAt - a.updatedAt));
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteNote(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
    tx.objectStore(STORE_NOTES).delete(id);
  });
}

/* ---------- CATEGORIES ---------- */
export async function saveCategory(cat) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    tx.oncomplete = () => resolve(cat);
    tx.onerror = (e) => reject(e.target.error);
    tx.objectStore(STORE_CATEGORIES).put(cat);
  });
}

export async function listCategories() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORIES, 'readonly');
    const req = tx.objectStore(STORE_CATEGORIES).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteCategory(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
    tx.objectStore(STORE_CATEGORIES).delete(id);
  });
}

/* ---------- DEFAULT CATEGORIES ---------- */
export const DEFAULT_CATEGORIES = [
  { id: 'default-work', name: 'Work', color: '#7da0fa' },
  { id: 'default-ideas', name: 'Ideas', color: '#f8b26a' },
  { id: 'default-personal', name: 'Personal', color: '#a0e6a0' }
];