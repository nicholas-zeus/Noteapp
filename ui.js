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
const devConsole = document.getElementById('devConsole');
const clearConsoleBtn = document.getElementById('clearConsoleBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const lightThemeBtn = document.getElementById('lightThemeBtn');
const darkThemeBtn = document.getElementById('darkThemeBtn');

const categoryFilterTrigger = document.getElementById('categoryFilterTrigger');
const categoryFilterLabel = document.getElementById('categoryFilterLabel');
const categoryFilterSwatch = categoryFilterTrigger?.querySelector('.cat-swatch');

const categoriesList = document.getElementById('categoriesList');
const newCategoryName = document.getElementById('newCategoryName');
const newCategoryColor = document.getElementById('newCategoryColor');
const addCategoryBtn = document.getElementById('addCategoryBtn');

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

/* ---------- Cards ---------- */
function renderCards() {
  cardsView.innerHTML = '';
  const notes = activeFilterId
    ? allNotes.filter(n => n.primaryCategoryId === activeFilterId)
    : allNotes;

  notes.forEach((n, i) => {
    const cat = categoryById(n.primaryCategoryId) || { color: '#1b2030', name: 'Uncategorized' };
    const card = document.createElement('article');
    card.className = 'card';
    card.style.background = `linear-gradient(180deg, ${cat.color}C0, rgba(0,0,0,.1))`;
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

/* ---------- New note ---------- */
newNoteBtn.addEventListener('click', async () => {
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
    updatedAt: Date.now(),
  };
  await saveNote(newNote);
  await refresh();
  const cat = firstCat || { color: '#CDE7FF' };
  const note = allNotes.find(n => n.id === id);
  openEditor(note, cat.color);
});

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
});
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') settingsModal.classList.add('hidden');
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

/* ---------- Notes Change Refresh ---------- */
document.addEventListener('notes:changed', refresh);
/* ---------- Dev Console Overlay ---------- */
(function interceptConsole() {
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(...args);
    const msg = args.map(a => 
      typeof a === 'object' ? JSON.stringify(a, null, 2) : a
    ).join(' ');
    if (devConsole) {
      const line = document.createElement('div');
      line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
      devConsole.appendChild(line);
      devConsole.scrollTop = devConsole.scrollHeight;
    }
  };
})();

clearConsoleBtn.addEventListener('click', () => {
  if (devConsole) devConsole.innerHTML = '';
});
/* ---------- First Load ---------- */
refresh();