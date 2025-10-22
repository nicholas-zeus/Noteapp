import { listNotes, saveNote, listCategories, saveCategory, deleteCategory } from './db.js';
import { DEFAULT_CATEGORIES, textColorFor } from './color.js';
import { openEditor, loadNoteIntoEditor } from './editor.js';

// Elements
const cardsView = document.getElementById('cardsView');
const newNoteBtn = document.getElementById('newNoteBtn');
const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
const categoryFilterEl = document.getElementById('categoryFilter');

const categoriesModal = document.getElementById('categoriesModal');
const closeCategoriesBtn = document.getElementById('closeCategoriesBtn');
const categoriesList = document.getElementById('categoriesList');
const newCategoryName = document.getElementById('newCategoryName');
const newCategoryColor = document.getElementById('newCategoryColor');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const primaryCategorySelect = document.getElementById('primaryCategorySelect');

let allNotes = [];
let allCategories = [];
let activeFilterId = null;

async function ensureDefaultCategories(){
  allCategories = await listCategories();
  if (!allCategories.length) {
    for (const c of DEFAULT_CATEGORIES) await saveCategory(c);
    allCategories = await listCategories();
  }
}

function renderCategoryFilter(){
  categoryFilterEl.innerHTML = '';
  const allChip = document.createElement('div');
  allChip.className = 'chip' + (!activeFilterId ? ' active' : '');
  allChip.textContent = 'All';
  allChip.addEventListener('click', ()=> { activeFilterId = null; renderCards(); renderCategoryFilter(); });
  categoryFilterEl.appendChild(allChip);

  for (const c of allCategories) {
    const chip = document.createElement('div');
    chip.className = 'chip' + (activeFilterId === c.id ? ' active' : '');
    chip.textContent = c.name;
    chip.style.background = c.color;
    chip.style.color = textColorFor(c.color);
    chip.addEventListener('click', ()=>{
      activeFilterId = (activeFilterId === c.id) ? null : c.id;
      renderCards(); renderCategoryFilter();
    });
    categoryFilterEl.appendChild(chip);
  }
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
    card.style.background = `linear-gradient(180deg, ${cat.color}B3, rgba(0,0,0,.1))`;
    card.style.color = textColorFor(cat.color);
    card.style.animation = `fadeIn .25s ease ${i*0.03}s both`;
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
  renderCategoryFilter();
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
    primaryCategoryId: firstCat?.id || null,
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

/* Categories Modal */
manageCategoriesBtn.addEventListener('click', async ()=>{
  await paintCategoriesList();
  categoriesModal.classList.remove('hidden');
});
closeCategoriesBtn.addEventListener('click', ()=> categoriesModal.classList.add('hidden'));
addCategoryBtn.addEventListener('click', async ()=>{
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