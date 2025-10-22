/**
 * Sync Manager (extensible):
 * Add adapters that implement:
 *  - upsertNote(note)
 *  - deleteNote(id)
 *  - pullAllNotes()
 *  - upsertCategory(cat)
 *  - deleteCategory(id)
 *  - pullAllCategories()
 *
 * Wire in Firebase, Supabase, GitHub (Gist/Repo) later without touching UI.
 */

export class SyncAdapter {
  async upsertNote(note){ throw new Error('not implemented'); }
  async deleteNote(id){ throw new Error('not implemented'); }
  async pullAllNotes(){ return []; }

  async upsertCategory(cat){ throw new Error('not implemented'); }
  async deleteCategory(id){ throw new Error('not implemented'); }
  async pullAllCategories(){ return []; }
}

export class SyncManager {
  constructor(adapters = []){ this.adapters = adapters; }
  addAdapter(adapter){ this.adapters.push(adapter); }

  // Fan-out writes; tolerate partial failures (log)
  async upsertNote(note){
    for (const a of this.adapters) { try { await a.upsertNote(note); } catch(e){ console.warn(e); } }
  }
  async deleteNote(id){
    for (const a of this.adapters) { try { await a.deleteNote(id); } catch(e){ console.warn(e); } }
  }
  async syncDown(){
    // Example strategy: last-write-wins by updatedAt
    const incomingNotes = [];
    const incomingCats = [];
    for (const a of this.adapters) {
      try { incomingNotes.push(...await a.pullAllNotes()); } catch(e){ console.warn(e); }
      try { incomingCats.push(...await a.pullAllCategories()); } catch(e){ console.warn(e); }
    }
    return { notes: incomingNotes, categories: incomingCats };
  }
}

/* Example stubs you can flesh out later

export class FirebaseAdapter extends SyncAdapter {
  constructor(firebaseApp){ super(); this.app = firebaseApp; }
  async upsertNote(note){ // call Firestore setDoc(..., {merge:true}) }
  async pullAllNotes(){ // query Firestore }
}

export class GithubAdapter extends SyncAdapter {
  constructor(token, repo){ super(); this.token = token; this.repo = repo; }
  async upsertNote(note){ // write JSON into repo path or Gist via API }
  async pullAllNotes(){ // read and parse }
}

*/