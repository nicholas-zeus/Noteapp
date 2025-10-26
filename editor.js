import { saveNote, getNote, deleteNote, listCategories } from './db.js';
import { textColorFor } from './color.js';
import { recordAudioFlow } from './audio.js';

let codeMirror = null;
let stopRecording = null;
const categoryFilterTrigger = document.getElementById('categoryFilterTrigger');
const categoryFilterLabel = document.getElementById('categoryFilterLabel');
const categoryFilterSwatch = categoryFilterTrigger.querySelector('.cat-swatch');

const categorySelectTrigger = document.getElementById('categorySelectTrigger');
const categorySelectLabel = document.getElementById('categorySelectLabel');
const categorySelectSwatch = categorySelectTrigger.querySelector('.cat-swatch');
const els = {
  overlay: document.getElementById('editorOverlay'),
  panel: document.getElementById('editorPanel'),
  title: document.getElementById('noteTitle'),
  rich: document.getElementById('richEditor'),
  code: document.getElementById('codeEditor'),
  saveStatus: document.getElementById('saveStatus'),
  primaryCategorySelect: document.getElementById('primaryCategorySelect'),
  imageInput: document.getElementById('imageInput'),
  insertCheckboxBtn: document.getElementById('insertCheckboxBtn'),
  closeBtn: document.getElementById('closeEditorBtn'),

  // dropdown menu
  moreMenuBtn: document.getElementById('moreMenuBtn'),
  moreMenu: document.getElementById('moreMenu'),
  addImageMenuBtn: document.getElementById('addImageMenuBtn'),
  addVoiceMenuBtn: document.getElementById('addVoiceMenuBtn'),
  toggleCodeMenuBtn: document.getElementById('toggleCodeMenuBtn'),
  deleteNoteMenuBtn: document.getElementById('deleteNoteMenuBtn'),
};
const categoryOverlay = document.getElementById('categoryOverlay');
const closeCategoryOverlayBtn = document.getElementById('closeCategoryOverlayBtn');
const categoryOverlayList = document.getElementById('categoryOverlayList');
let activeNote = null;
let autosaveTimer = null;

export async function openEditor(note, catColor) {
  activeNote = note;
  applyEditorTheme(catColor || '#CDE7FF');

  els.title.value = note.title || '';
  els.rich.innerHTML = note.format === 'code' ? '' : (note.content || '');
  els.code.classList.toggle('hidden', note.format !== 'code');
  els.rich.classList.toggle('hidden', note.format === 'code');

  if (note.format === 'code') ensureCodeMirror(note.content || '');
  else destroyCodeMirror();

  document.body.classList.add('editing');
  els.overlay.classList.remove('hidden');
  els.title.focus();
}

export function closeEditor() {
  els.overlay.classList.add('hidden');
  document.body.classList.remove('editing');
  destroyCodeMirror();
  activeNote = null;
}

/* ---------- CodeMirror ---------- */
function ensureCodeMirror(value) {
  if (codeMirror) return;
  codeMirror = window.CodeMirror.fromTextArea(els.code, {
    mode: 'javascript',
    lineNumbers: true,
    tabSize: 2,
    indentUnit: 2,
    theme: 'default',
  });
  codeMirror.setValue(value || '');
  codeMirror.on('change', scheduleAutosave);
}

function destroyCodeMirror() {
  if (!codeMirror) return;
  codeMirror.toTextArea();
  codeMirror = null;
}

/* ---------- Autosave ---------- */
function scheduleAutosave() {
  els.saveStatus.textContent = 'Saving…';
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveCurrentNote, 350);
}

async function saveCurrentNote() {
  if (!activeNote) return;
  const content = activeNote.format === 'code'
    ? (codeMirror?.getValue() || '')
    : els.rich.innerHTML;

  activeNote.title = els.title.value.trim() || 'Untitled';
  activeNote.content = content;
if (activeNote.primaryCategoryId === undefined)
  activeNote.primaryCategoryId = '';


  await saveNote(activeNote);
  els.saveStatus.textContent = 'Saved ✓';
  document.dispatchEvent(new CustomEvent('notes:changed'));
}

/* ---------- Theme ---------- */
function applyEditorTheme() {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';

  let defaultText, border, background;
  switch (theme) {
    case 'light':
      defaultText = '#111';
      border = 'rgba(0,0,0,.1)';
      background = '#ffffff';
      break;
    case 'material':
      defaultText = '#1e1f23';
      border = 'rgba(0,0,0,.1)';
      background = '#ffffff';
      break;
    default: // dark
      defaultText = '#e9ecf1';
      border = 'rgba(255,255,255,.12)';
      background = '#1b2030';
  }

  els.panel.style.background = background;
  els.panel.style.color = defaultText;
  els.rich.style.background = background;
  els.rich.style.color = defaultText;

  document.querySelectorAll('.tool, .title-input, .select').forEach(el => {
    el.style.color = defaultText;
    el.style.borderColor = border;
    el.style.background = 'transparent';
  });
}


/* ---------- Editing Tools ---------- */
function wrapSelection(cmd) {
  els.rich.focus();
  document.execCommand(cmd, false, null);
  scheduleAutosave();
}

function insertChecklist() {
  const p = document.createElement('p');
  p.className = 'checkline';
  p.innerHTML = `<input type="checkbox" /> <span>Checklist item</span>`;
  els.rich.appendChild(p);
  scheduleAutosave();
}

function onCheckToggle(e) {
  const line = e.target.closest('.checkline');
  if (!line) return;
  line.classList.toggle('done', e.target.checked);
  scheduleAutosave();
}

function insertImage(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = document.createElement('img');
    img.src = reader.result;
    els.rich.appendChild(img);
    scheduleAutosave();
  };
  reader.readAsDataURL(file);
}

function insertAudio(dataUrl) {
  const wrap = document.createElement('div');
  wrap.className = 'audio-chip';
  wrap.innerHTML = `<audio controls src="${dataUrl}"></audio>`;
  els.rich.appendChild(wrap);
  scheduleAutosave();
}

/* ---------- Events ---------- */
// formatting
document.querySelectorAll('.tool[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => wrapSelection(btn.dataset.cmd));
});
els.insertCheckboxBtn.addEventListener('click', insertChecklist);
els.rich.addEventListener('change', onCheckToggle);
els.rich.addEventListener('input', scheduleAutosave);
els.title.addEventListener('input', scheduleAutosave);

// category change
// open overlay instead of native select
/*els.primaryCategorySelect.addEventListener('click', async (e) => {
  e.preventDefault();
  const cats = await listCategories();
  categoryOverlayList.innerHTML = '';
  cats.forEach(c => {
    const item = document.createElement('div');
    item.className = 'cat-option';
    item.innerHTML = `<div class="cat-swatch" style="background:${c.color}"></div><div>${c.name}</div>`;
    item.addEventListener('click', async () => {
      activeNote.primaryCategoryId = c.id;
      await saveNote(activeNote);
      applyEditorTheme(c.color);
      categoryOverlay.classList.add('hidden');
      document.dispatchEvent(new CustomEvent('notes:changed'));
    });
    categoryOverlayList.appendChild(item);
  });
  categoryOverlay.classList.remove('hidden');
});*/
/*closeCategoryOverlayBtn.addEventListener('click', () => categoryOverlay.classList.add('hidden'));*/

/* ---------- Dropdown Menu ---------- */
els.moreMenuBtn.addEventListener('click', e => {
  e.stopPropagation();

  // Toggle visibility
  const wasHidden = els.moreMenu.classList.contains('hidden');
  els.moreMenu.classList.toggle('hidden');

  if (wasHidden) {
    // Get button’s position relative to viewport
    const rect = els.moreMenuBtn.getBoundingClientRect();
    const menu = els.moreMenu;

    // Attach the dropdown right below the button
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${rect.left - menu.offsetWidth + rect.width}px`;
    menu.style.right = 'auto';
    menu.style.zIndex = 20000;
  }
});

document.addEventListener('click', () => els.moreMenu.classList.add('hidden'));

// menu actions
els.addImageMenuBtn.addEventListener('click', () => {
  els.imageInput.click();
});

els.imageInput.addEventListener('change', e => {
  const f = e.target.files?.[0];
  if (f) insertImage(f);
  e.target.value = '';
});

els.addVoiceMenuBtn.addEventListener('click', async () => {
  if (!stopRecording) {
    stopRecording = await recordAudioFlow(
      insertAudio,
      s => (els.saveStatus.textContent = s)
    );
    els.addVoiceMenuBtn.textContent = 'Stop Recording ⏹';
  } else {
    stopRecording();
    stopRecording = null;
    els.addVoiceMenuBtn.textContent = 'Record Voice 🎙';
  }
});

els.toggleCodeMenuBtn.addEventListener('click', () => {
  if (!activeNote) return;
  if (activeNote.format === 'code') {
    activeNote.format = 'richtext';
    els.code.classList.add('hidden');
    els.rich.classList.remove('hidden');
    els.rich.innerHTML = codeMirror?.getValue() || '';
    destroyCodeMirror();
  } else {
    activeNote.format = 'code';
    els.rich.classList.add('hidden');
    els.code.classList.remove('hidden');
    ensureCodeMirror(els.rich.innerHTML);
  }
  scheduleAutosave();
});

els.deleteNoteMenuBtn.addEventListener('click', async () => {
  if (!activeNote) return;
  const ok = confirm('Delete this note?');
  if (!ok) return;
  await deleteNote(activeNote.id);
  document.dispatchEvent(new CustomEvent('notes:changed'));
  closeEditor();
});

els.closeBtn.addEventListener('click', closeEditor);
// shared overlay logic
let overlayContext = null; // "filter" or "assign"

async function openCategoryOverlay(context) {
  overlayContext = context;
  const cats = await listCategories();
  categoryOverlayList.innerHTML = '';

  // Build category list with color swatches
  cats.forEach(c => {
    const item = document.createElement('div');
    item.className = 'category-option';
    item.innerHTML = `
      <span class="cat-swatch" style="background:${c.color}"></span>
      <span class="cat-name">${c.name}</span>
    `;

    item.addEventListener('click', async () => {
      categoryOverlay.classList.add('hidden');
      if (context === 'filter') {
        // filter mode
        categoryFilterLabel.textContent = c.name;
        categoryFilterSwatch.style.background = c.color;
        document.dispatchEvent(new CustomEvent('categoryFilterChanged', { detail: c.id }));
      } else if (context === 'assign' && activeNote) {
        // editor assignment
        activeNote.primaryCategoryId = c.id;
        await saveNote(activeNote);
        applyEditorTheme(c.color);
        categorySelectLabel.textContent = c.name;
        categorySelectSwatch.style.background = c.color;
        document.dispatchEvent(new CustomEvent('notes:changed'));
      }
    });

    categoryOverlayList.appendChild(item);
  });

  // Add "All Categories" option for filter mode
  if (context === 'filter') {
    const allItem = document.createElement('div');
    allItem.className = 'category-option';
    allItem.innerHTML = `
      <span class="cat-swatch" style="background:transparent;border:1px dashed var(--muted)"></span>
      <span class="cat-name">All Categories</span>
    `;
    allItem.addEventListener('click', () => {
      categoryFilterLabel.textContent = 'All Categories';
      categoryFilterSwatch.style.background = 'transparent';
      categoryOverlay.classList.add('hidden');
      document.dispatchEvent(new CustomEvent('categoryFilterChanged', { detail: null }));
    });
    categoryOverlayList.prepend(allItem);
  }

  categoryOverlay.classList.remove('hidden');
}
categorySelectTrigger.addEventListener('click', (e) => {
  e.preventDefault();
  openCategoryOverlay('assign');
});

categoryFilterTrigger.addEventListener('click', (e) => {
  e.preventDefault();
  openCategoryOverlay('filter');
});

closeCategoryOverlayBtn.addEventListener('click', () => {
  categoryOverlay.classList.add('hidden');
});

/* ---------- Export helper ---------- */
export async function loadNoteIntoEditor(id) {
  const note = await getNote(id);
  return note;
}