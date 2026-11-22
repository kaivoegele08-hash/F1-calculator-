import { MemoryStore } from './memoryStore';
import type { DataStore } from './types';

const KEY = 'tagwerk.web.v1';

class WebStore extends MemoryStore {
  protected changed(): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, this.serialize());
    } catch {
      /* storage may be full or blocked, the app keeps working in memory */
    }
  }
}

/** Web / default: in-memory store persisted to localStorage. */
export function createStore(): DataStore {
  const store = new WebStore();
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(KEY);
      if (raw) store.restore(raw);
    }
  } catch {
    /* ignore corrupt data */
  }
  return store;
}
