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
  activeNote.primaryCategoryId =
    document.getElementById('primaryCategorySelect').value || '';

  await saveNote(activeNote);
  els.saveStatus.textContent = 'Saved ✓';
  document.dispatchEvent(new CustomEvent('notes:changed'));
}

/* ---------- Theme ---------- */
function applyEditorTheme(bgHex) {
  const textHex = textColorFor(bgHex);
  els.panel.style.background = `linear-gradient(180deg, ${bgHex}40, rgba(0,0,0,.35))`;
  els.panel.style.color = textHex;
  els.rich.style.background = 'transparent';
  els.rich.style.color = textHex;
  document
    .querySelectorAll('.tool,.title-input,.select')
    .forEach(el => {
      el.style.color = textHex;
      el.style.borderColor = textHex + '33';
      el.style.background = 'rgba(0,0,0,.08)';
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
  els.moreMenu.classList.toggle('hidden');
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
  cats.forEach(c => {
    const item = document.createElement('div');
    item.className = 'cat-option';
    item.innerHTML = `<div class="cat-swatch" style="background:${c.color}"></div><div>${c.name}</div>`;
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

  // also add an "All Categories" option for filter view
  if (context === 'filter') {
    const allItem = document.createElement('div');
    allItem.className = 'cat-option';
    allItem.textContent = 'All Categories';
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