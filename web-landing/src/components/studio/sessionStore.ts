// localStorage-based session persistence for the pad grid.
// Schema is versioned — bump `Session.version` on incompatible changes
// and add a migration in load().

import type { ScaleId } from "./scales";
import type { SceneLibrary, Track } from "./clips";

export type SessionSlot = "auto" | "1" | "2" | "3";

export type Session = {
  version: 1;
  scale: ScaleId;
  rootPc: number;
  swing: number;
  bpm: number;
  masterVol: number;
  tracks: Record<Track, { mute: boolean; vol: number; send: number }>;
  library: SceneLibrary;
};

const KEY = (slot: SessionSlot) => `sai.studio.session.${slot}`;
const META_KEY = (slot: SessionSlot) => `sai.studio.session.${slot}.meta`;

export function save(slot: SessionSlot, s: Session): void {
  try {
    localStorage.setItem(KEY(slot), JSON.stringify(s));
    localStorage.setItem(META_KEY(slot), JSON.stringify({
      savedAt: new Date().toISOString(),
      bpm: s.bpm,
    }));
  } catch (e) {
    console.warn("sessionStore.save failed", e);
  }
}

export function load(slot: SessionSlot): Session | null {
  try {
    const raw = localStorage.getItem(KEY(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clear(slot: SessionSlot): void {
  localStorage.removeItem(KEY(slot));
  localStorage.removeItem(META_KEY(slot));
}

export function listSlots(): { slot: SessionSlot; savedAt: string; bpm: number }[] {
  const out: { slot: SessionSlot; savedAt: string; bpm: number }[] = [];
  for (const slot of ["auto", "1", "2", "3"] as SessionSlot[]) {
    const raw = localStorage.getItem(META_KEY(slot));
    if (!raw) continue;
    try {
      const meta = JSON.parse(raw);
      out.push({ slot, savedAt: meta.savedAt, bpm: meta.bpm });
    } catch { /* skip */ }
  }
  return out;
}
