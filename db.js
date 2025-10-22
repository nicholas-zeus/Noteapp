// IndexedDB minimal wrapper (notes & categories stores)
const DB_NAME = 'notes3d-db';
const DB_VERSION = 1;
const STORE_NOTES = 'notes';
const STORE_CATEGORIES = 'categories';

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const notes = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
        notes.createIndex('updatedAt', 'updatedAt');
        notes.createIndex('primaryCategoryId', 'primaryCategoryId');
      }
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

async function tx(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const r = fn(store);
    t.oncomplete = () => resolve(r);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

// NOTES
export async function saveNote(note) {
  note.updatedAt = Date.now();
  await tx(STORE_NOTES, 'readwrite', (s) => s.put(note));
  return note;
}
export async function getNote(id) {
  return new Promise(async (resolve, reject) => {
    await tx(STORE_NOTES, 'readonly', (s) => {
      const req = s.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}
export async function deleteNote(id) {
  await tx(STORE_NOTES, 'readwrite', (s) => s.delete(id));
}
export async function listNotes() {
  return new Promise(async (resolve, reject) => {
    const out = [];
    await tx(STORE_NOTES, 'readonly', (s) => {
      const req = s.openCursor(null, 'prev'); // newest first if by key; we'll sort later by updatedAt
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { out.push(cursor.value); cursor.continue(); }
        else {
          out.sort((a,b)=> (b.updatedAt||0) - (a.updatedAt||0));
          resolve(out);
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

// CATEGORIES
export async function saveCategory(cat) { await tx(STORE_CATEGORIES, 'readwrite', (s)=>s.put(cat)); return cat; }
export async function listCategories() {
  return new Promise(async (resolve, reject) => {
    const arr = [];
    await tx(STORE_CATEGORIES, 'readonly', (s) => {
      const req = s.openCursor();
      req.onsuccess = (e) => { const c = e.target.result; if (c) { arr.push(c.value); c.continue(); } else resolve(arr); };
      req.onerror = () => reject(req.error);
    });
  });
}
export async function deleteCategory(id){ await tx(STORE_CATEGORIES, 'readwrite', (s)=>s.delete(id)); }