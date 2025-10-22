import { saveNote, getNote } from './db.js';
import { textColorFor } from './color.js';
import { recordAudioFlow } from './audio.js';

let codeMirror = null;
let stopRecording = null;

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
  recordBtn: document.getElementById('recordBtn'),
  toggleCodeBtn: document.getElementById('toggleCodeModeBtn'),
  closeBtn: document.getElementById('closeEditorBtn'),
};

let activeNote = null;
let autosaveTimer = null;

export async function openEditor(note, catColor){
  activeNote = note;
  applyEditorTheme(catColor || '#CDE7FF');

  els.title.value = note.title || '';
  els.rich.innerHTML = note.format === 'code' ? '' : (note.content || '');
  els.code.classList.toggle('hidden', note.format !== 'code');
  els.rich.classList.toggle('hidden', note.format === 'code');

  if (note.format === 'code') ensureCodeMirror(note.content || '');
  else destroyCodeMirror();

  els.overlay.classList.remove('hidden');
  els.title.focus();
}
export function closeEditor(){
  els.overlay.classList.add('hidden');
  destroyCodeMirror();
  activeNote = null;
}

function ensureCodeMirror(value){
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
function destroyCodeMirror(){
  if (!codeMirror) return;
  codeMirror.toTextArea();
  codeMirror = null;
}

function scheduleAutosave(){
  els.saveStatus.textContent = 'Saving…';
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveCurrentNote, 400);
}

async function saveCurrentNote(){
  if (!activeNote) return;
  const content = activeNote.format === 'code' ? (codeMirror?.getValue() || '') : els.rich.innerHTML;
  activeNote.title = els.title.value.trim() || 'Untitled';
  activeNote.content = content;
  activeNote.primaryCategoryId = document.getElementById('primaryCategorySelect').value || null;
  await saveNote(activeNote);
  els.saveStatus.textContent = 'Saved ✓';
  document.dispatchEvent(new CustomEvent('notes:changed')); // refresh cards
}

function applyEditorTheme(bgHex){
  const textHex = textColorFor(bgHex);
  els.panel.style.background = `linear-gradient(180deg, ${bgHex}40, rgba(0,0,0,.35))`;
  els.panel.style.color = textHex;
  els.rich.style.background = 'transparent';
  els.rich.style.color = textHex;
  document.querySelectorAll('.tool,.title-input,.select').forEach(el=>{
    el.style.color = textHex;
    el.style.borderColor = textHex + '33';
    el.style.background = 'rgba(0,0,0,.08)';
  });
}

function wrapSelection(tag){
  document.execCommand(tag); // pragmatic, widely supported for basics
  scheduleAutosave();
}

function insertChecklist(){
  const p = document.createElement('p');
  p.className = 'checkline';
  p.innerHTML = `<input type="checkbox" /> <span>Checklist item</span>`;
  els.rich.appendChild(p);
  p.querySelector('span').focus();
  scheduleAutosave();
}

function onCheckToggle(e){
  const line = e.target.closest('.checkline');
  if (!line) return;
  if (e.target.checked) line.classList.add('done');
  else line.classList.remove('done');
  scheduleAutosave();
}

function insertImage(file){
  const reader = new FileReader();
  reader.onload = () => {
    const img = document.createElement('img');
    img.src = reader.result; // data URL persisted in note HTML
    els.rich.appendChild(img);
    scheduleAutosave();
  };
  reader.readAsDataURL(file);
}

function insertAudio(dataUrl){
  const wrap = document.createElement('div');
  wrap.className = 'audio-chip';
  wrap.innerHTML = `<audio controls src="${dataUrl}"></audio>`;
  els.rich.appendChild(wrap);
  scheduleAutosave();
}

/* Event wiring */
document.querySelectorAll('.tool[data-cmd]').forEach(btn=>{
  btn.addEventListener('click', ()=> wrapSelection(btn.dataset.cmd));
});
els.insertCheckboxBtn.addEventListener('click', insertChecklist);
els.rich.addEventListener('change', onCheckToggle);
els.rich.addEventListener('input', scheduleAutosave);
els.title.addEventListener('input', scheduleAutosave);

els.imageInput.addEventListener('change', (e)=> {
  const f = e.target.files?.[0]; if (f) insertImage(f);
  e.target.value = '';
});
els.recordBtn.addEventListener('click', async ()=>{
  if (!stopRecording) {
    stopRecording = await recordAudioFlow(insertAudio, (s)=> els.saveStatus.textContent = s);
  } else {
    stopRecording(); stopRecording = null;
  }
});

els.toggleCodeBtn.addEventListener('click', ()=>{
  if (!activeNote) return;
  if (activeNote.format === 'code') {
    // to rich
    activeNote.format = 'richtext';
    els.code.classList.add('hidden');
    els.rich.classList.remove('hidden');
    els.rich.innerHTML = codeMirror?.getValue() || '';
    destroyCodeMirror();
  } else {
    // to code
    activeNote.format = 'code';
    els.rich.classList.add('hidden');
    els.code.classList.remove('hidden');
    ensureCodeMirror(els.rich.innerHTML);
  }
  scheduleAutosave();
});

els.closeBtn.addEventListener('click', closeEditor);

export async function loadNoteIntoEditor(id){
  const note = await getNote(id);
  return note;
}