import { listNotes, saveNote, listCategories, saveCategory, deleteCategory } from './db.js';
import { DEFAULT_CATEGORIES, textColorFor } from './color.js';
import { openEditor, loadNoteIntoEditor } from './editor.js';

// Elements
const cardsView = document.getElementById('cardsView');
const newNoteBtn = document.getElementById('newNoteBtn');
const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
const categoryFilterSelect = document.getElementById('categoryFilterSelect');

const categoriesModal = document.getElementById('categoriesModal');
const closeCategoriesBtn = document.getElementById('closeCategoriesBtn');
const categoriesList = document.getElementById('categoriesList');
const newCategoryName = document.getElementById('newCategoryName');
const newCategoryColor = document.getElementById('newCategoryColor');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const primaryCategorySelect = document.getElementById('primaryCategorySelect');

let allNotes = [];
let allCategories = [];
let activeFilterId = ''; // '' means All

async function ensureDefaultCategories(){
  allCategories = await listCategories();
  if (!allCategories.length) {
    for (const c of DEFAULT_CATEGORIES) await saveCategory(c);
    allCategories = await listCategories();
  }
}

function renderCategoryFilterDropdown(){
  categoryFilterSelect.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = 'All categories';
  categoryFilterSelect.appendChild(allOpt);

  for (const c of allCategories) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    categoryFilterSelect.appendChild(opt);
  }
  categoryFilterSelect.value = activeFilterId;
}

function categoryById(id){ return allCategories.find(c=>c.id===id); }

function renderCards(){
  cardsView.innerHTML = '';
  const notes = activeFilterId
    ? allNotes.filter(n => n.primaryCategoryId === activeFilterId)
    : allNotes;

  notes.forEach((n, i)=> {
    const cat = categoryById(n.primaryCategoryId) || { color: '#1b2030', name: 'Uncategorized' };
    const card = document.createElement('article');
    card.className = 'card';
    card.style.background = `linear-gradient(180deg, ${cat.color}C0, rgba(0,0,0,.1))`;
    card.style.color = textColorFor(cat.color);
    card.style.animation = `fadeIn .25s ease ${i*0.02}s both`;
    card.innerHTML = `
      <h3 class="card-title">${escapeHtml(n.title || 'Untitled')}</h3>
      <div class="card-body">${previewFromContent(n)}</div>
      <div class="card-meta">
        <span class="badge">${escapeHtml(cat.name)}</span>
        <span>${new Date(n.updatedAt||Date.now()).toLocaleString()}</span>
      </div>
    `;
    card.addEventListener('click', async ()=>{
      const note = await loadNoteIntoEditor(n.id);
      openEditor(note, cat.color);
      primaryCategorySelect.value = note.primaryCategoryId || '';
    });
    cardsView.appendChild(card);
  });
}

function previewFromContent(note){
  if (note.format === 'code') {
    const text = (note.content || '').toString();
    return `<pre><code>${escapeHtml(text.slice(0, 180))}${text.length>180?'…':''}</code></pre>`;
  } else {
    const tmp = document.createElement('div');
    tmp.innerHTML = note.content || '';
    const img = tmp.querySelector('img');
    if (img) return `<img src="${img.src}" style="max-height:120px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.35);"/>`;
    const text = tmp.textContent?.trim() || '';
    return `<p>${escapeHtml(text.slice(0, 200))}${text.length>200?'…':''}</p>`;
  }
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

async function refresh(){
  await ensureDefaultCategories();
  allNotes = await listNotes();
  renderCategoryFilterDropdown();
  renderCards();
  renderPrimaryCategorySelect();
}

function renderPrimaryCategorySelect(){
  primaryCategorySelect.innerHTML = `<option value="">Uncategorized</option>`;
  for (const c of allCategories) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    primaryCategorySelect.appendChild(opt);
  }
}

/* Cards: create new note */
newNoteBtn.addEventListener('click', async ()=>{
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
  const note = allNotes.find(n=>n.id===id);
  const { openEditor } = await import('./editor.js');
  openEditor(note, cat.color);
  primaryCategorySelect.value = note.primaryCategoryId || '';
});

/* Dropdown filter */
categoryFilterSelect.addEventListener('change', ()=>{
  activeFilterId = categoryFilterSelect.value || '';
  renderCards();
});

/* Categories Modal */
manageCategoriesBtn.addEventListener('click', async ()=>{
  await paintCategoriesList();
  categoriesModal.classList.remove('hidden');
});
document.getElementById('closeCategoriesBtn').addEventListener('click', ()=> categoriesModal.classList.add('hidden'));

document.getElementById('addCategoryBtn').addEventListener('click', async ()=>{
  const name = newCategoryName.value.trim();
  const color = newCategoryColor.value;
  if (!name) return;
  await saveCategory({ id: crypto.randomUUID(), name, color });
  newCategoryName.value=''; await paintCategoriesList(); await refresh();
});

async function paintCategoriesList(){
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
    row.querySelector('button').addEventListener('click', async ()=>{
      await deleteCategory(c.id);
      await paintCategoriesList(); await refresh();
    });
    categoriesList.appendChild(row);
  }
}

document.addEventListener('notes:changed', refresh);

// First load
refresh();