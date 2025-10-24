import { listNotes, saveNote, listCategories, saveCategory, deleteCategory } from './db.js';
import { DEFAULT_CATEGORIES, textColorFor } from './color.js';
import { openEditor, loadNoteIntoEditor } from './editor.js';

/* ---------- Apply saved theme before anything renders ---------- */
const savedTheme = localStorage.getItem('theme') || 'dark';
applyTheme(savedTheme);

/* ---------- Elements ---------- */
const cardsView = document.getElementById('cardsView');
const fabNewNote = document.getElementById('fabNewNote');
fabNewNote.addEventListener('click', async () => {
  const id = crypto.randomUUID();
  const firstCat = allCategories[0];
  const newNote = {
    id,
    title: 'Untitled',
    content: '<p></p>',
    format: 'richtext',
    categories: firstCat ? [firstCat.id] : [],
    primaryCategoryId: firstCat?.id || '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await saveNote(newNote);
  await refresh();
  const cat = firstCat || { color: '#CDE7FF' };
  const note = allNotes.find(n => n.id === id);
  openEditor(note, cat.color);
});
let searchTerm = '';

function plainTextFromHtml(html){
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || '').trim();
}

function getVisibleNotes(){
  // category filter
  let notes = activeFilterId
    ? allNotes.filter(n => n.primaryCategoryId === activeFilterId)
    : allNotes;

  // search filter (case-insensitive) on title + content text
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    notes = notes.filter(n => {
      const t = (n.title || '').toLowerCase();
      const c = plainTextFromHtml(n.content || '').toLowerCase();
      return t.includes(q) || c.includes(q);
    });
  }
  return notes;
}


const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const lightThemeBtn = document.getElementById('lightThemeBtn');
const darkThemeBtn = document.getElementById('darkThemeBtn');
const materialThemeBtn = document.getElementById('materialThemeBtn');

const categoryFilterTrigger = document.getElementById('categoryFilterTrigger');
const categoryFilterLabel = document.getElementById('categoryFilterLabel');
const categoryFilterSwatch = categoryFilterTrigger?.querySelector('.cat-swatch');

const categoriesList = document.getElementById('categoriesList');
const newCategoryName = document.getElementById('newCategoryName');
const newCategoryColor = document.getElementById('newCategoryColor');
const addCategoryBtn = document.getElementById('addCategoryBtn');
// Live-update color box background
newCategoryColor.addEventListener('input', (e) => {
  e.target.style.background = e.target.value;
});


let allNotes = [];
let allCategories = [];
let activeFilterId = ''; // '' means All

/* ---------- Category helpers ---------- */
async function ensureDefaultCategories() {
  allCategories = await listCategories();
  if (!allCategories.length) {
    for (const c of DEFAULT_CATEGORIES) await saveCategory(c);
    allCategories = await listCategories();
  }
}

function categoryById(id) {
  return allCategories.find(c => c.id === id);
}
// Search elements
const searchWrap = document.getElementById('searchWrap');
const searchInput = document.getElementById('searchInput');
const searchResetBtn = document.getElementById('searchResetBtn');

const searchOpenBtn = document.getElementById('searchOpenBtn'); // mobile icon
const mobileSearchBar = document.getElementById('mobileSearchBar');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const mobileSearchCloseBtn = document.getElementById('mobileSearchCloseBtn');

// Desktop: live filter
if (searchInput) {
  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value.trim();
    renderCards();
  });
  searchResetBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    renderCards();
    searchInput.focus();
  });
}

// Mobile: open/close + live filter
if (searchOpenBtn) {
  searchOpenBtn.addEventListener('click', () => {
    document.body.classList.add('search-active');
    mobileSearchBar.setAttribute('aria-hidden', 'false');
    mobileSearchInput.value = searchTerm;
    setTimeout(() => mobileSearchInput.focus(), 0);
  });
}
if (mobileSearchCloseBtn) {
  mobileSearchCloseBtn.addEventListener('click', () => {
    mobileSearchInput.value = '';
    searchTerm = '';
    renderCards();
    mobileSearchBar.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('search-active');
  });
}
if (mobileSearchInput) {
  mobileSearchInput.addEventListener('input', () => {
    searchTerm = mobileSearchInput.value.trim();
    renderCards();
  });
}

/* ---------- Cards ---------- */
function renderCards() {
  cardsView.innerHTML = '';
  const notes = getVisibleNotes();
  

  notes.forEach((n, i) => {
    const cat = categoryById(n.primaryCategoryId) || { color: '#1b2030', name: 'Uncategorized' };
    const card = document.createElement('article');
    card.className = 'card';
    card.style.background = `linear-gradient(rgba(255,255,255,0.3), ${cat.color})`;
    card.style.color = textColorFor(cat.color);
    card.style.animation = `fadeIn .25s ease ${i * 0.02}s both`;
    card.innerHTML = `
      <h3 class="card-title">${escapeHtml(n.title || 'Untitled')}</h3>
      <div class="card-body">${previewFromContent(n)}</div>
      <div class="card-meta">
        <span class="badge">${escapeHtml(cat.name)}</span>
        <span>${new Date(n.updatedAt || Date.now()).toLocaleString()}</span>
      </div>
    `;
    card.addEventListener('click', async () => {
      const note = await loadNoteIntoEditor(n.id);
      openEditor(note, cat.color);
    });
    cardsView.appendChild(card);
  });
}

function previewFromContent(note) {
  if (note.format === 'code') {
    const text = (note.content || '').toString();
    return `<pre><code>${escapeHtml(text.slice(0, 180))}${text.length > 180 ? '…' : ''}</code></pre>`;
  } else {
    const tmp = document.createElement('div');
    tmp.innerHTML = note.content || '';
    const img = tmp.querySelector('img');
    if (img)
      return `<img src="${img.src}" style="max-height:120px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.35);"/>`;
    const text = tmp.textContent?.trim() || '';
    return `<p>${escapeHtml(text.slice(0, 200))}${text.length > 200 ? '…' : ''}</p>`;
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ---------- Refresh ---------- */
async function refresh() {
  await ensureDefaultCategories();
  allNotes = await listNotes();
  renderCards();
  updateCategoryFilterLabel();
}

function updateCategoryFilterLabel() {
  if (!activeFilterId) {
    categoryFilterLabel.textContent = 'All Categories';
    categoryFilterSwatch.style.background = 'transparent';
  } else {
    const cat = categoryById(activeFilterId);
    if (cat) {
      categoryFilterLabel.textContent = cat.name;
      categoryFilterSwatch.style.background = cat.color;
    }
  }
}


/* ---------- Category overlay event listener (from editor.js) ---------- */
document.addEventListener('categoryFilterChanged', e => {
  activeFilterId = e.detail || '';
  renderCards();
  updateCategoryFilterLabel();
});

/* ---------- Category list render ---------- */
async function paintCategoriesList() {
  allCategories = await listCategories();
  categoriesList.innerHTML = '';
  for (const c of allCategories) {
    const row = document.createElement('div');
    row.className = 'category-item';
    row.innerHTML = `
      <div class="category-swatch" style="background:${c.color}"></div>
      <div style="flex:1">
        <div style="font-weight:600">${c.name}</div>
        <div style="font-size:12px;opacity:.8">${c.color}</div>
      </div>
      <button class="btn tiny">Delete</button>
    `;
    row.querySelector('button').addEventListener('click', async () => {
      await deleteCategory(c.id);
      await paintCategoriesList();
      await refresh();
    });
    categoriesList.appendChild(row);
  }
}

/* ---------- Add Category ---------- */
addCategoryBtn.addEventListener('click', async () => {
  const name = newCategoryName.value.trim();
  const color = newCategoryColor.value;
  if (!name) return;
  await saveCategory({ id: crypto.randomUUID(), name, color });
  newCategoryName.value = '';
  await paintCategoriesList();
  await refresh();
});

/* ---------- Settings Modal ---------- */
settingsBtn.addEventListener('click', async () => {
  await paintCategoriesList();
  settingsModal.classList.remove('hidden');
  document.body.classList.add('settings-open');   // NEW
});
closeSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
  document.body.classList.remove('settings-open'); // NEW
});

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    settingsModal.classList.add('hidden');
    document.body.classList.remove('settings-open'); // NEW
  }
});

/* ---------- Theme Toggle ---------- */
function applyTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('theme', mode);

  // Dynamic contrast adjustment
  const appHeader = document.getElementById('appHeader');
  const overlay = document.getElementById('editorPanel');
  if (!appHeader) return;
  const bgColor = getComputedStyle(appHeader).backgroundColor;
  const hex = rgbToHex(bgColor);
  const textColor = textColorFor(hex);
  appHeader.style.color = textColor;
  if (overlay) overlay.style.color = textColor;
}

function rgbToHex(rgb) {
  const result = rgb.match(/\d+/g);
  if (!result) return '#000';
  return (
    '#' +
    result
      .slice(0, 3)
      .map(x => ('0' + parseInt(x).toString(16)).slice(-2))
      .join('')
  );
}

lightThemeBtn.addEventListener('click', () => applyTheme('light'));
darkThemeBtn.addEventListener('click', () => applyTheme('dark'));
materialThemeBtn.addEventListener('click', () => applyTheme('material'));
/* ---------- Notes Change Refresh ---------- */
document.addEventListener('notes:changed', refresh);


/* ---------- First Load ---------- */
refresh();