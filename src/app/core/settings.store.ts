import { Injectable, signal } from '@angular/core';

const KEY_STORAGE = 'elevenlabs-demo.apiKey';
const AGENT_STORAGE = 'elevenlabs-demo.agentId';

function read(storage: Storage, key: string): string {
  try {
    return storage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function write(storage: Storage, key: string, value: string): void {
  try {
    if (value) storage.setItem(key, value);
    else storage.removeItem(key);
  } catch {
    // storage unavailable: keep the value in memory only
  }
}

/** API key lives in sessionStorage only (cleared when the tab closes); agent id in localStorage. */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  readonly apiKey = signal(read(sessionStorage, KEY_STORAGE));
  readonly agentId = signal(read(localStorage, AGENT_STORAGE));

  setApiKey(value: string): void {
    const v = value.trim();
    this.apiKey.set(v);
    write(sessionStorage, KEY_STORAGE, v);
  }

  setAgentId(value: string): void {
    const v = value.trim();
    this.agentId.set(v);
    write(localStorage, AGENT_STORAGE, v);
  }
}
