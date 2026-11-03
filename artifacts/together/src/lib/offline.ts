const KEY = "together.offline";
export type OfflinePack = { savedAt: string; sections: { title: string; lines: string[] }[] };
export function readOffline(): OfflinePack | null {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
export function writeOffline(p: OfflinePack) { localStorage.setItem(KEY, JSON.stringify(p)); }
export function clearOffline() { localStorage.removeItem(KEY); }
