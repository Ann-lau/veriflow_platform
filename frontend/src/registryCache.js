import { fetchRegistry } from "./api.js";

// One copy of the water point registry lives on the phone (localStorage), so the Water points
// screen and the Log screen both work with no signal. The same key is used by both.
export const CACHE_KEY = "veriflow.registry.v1";
const AT_KEY = "veriflow.registry.at";
const FRESH_MS = 6 * 60 * 60 * 1000; // refresh at most every six hours

export function readRegistryCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

export function writeRegistryCache(value) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
    localStorage.setItem(AT_KEY, String(Date.now()));
  } catch {
    /* storage unavailable: the app still works, just without a saved copy */
  }
}

// Fetch the registry unless a recent copy is already on the phone. Called when the signal is good.
export async function ensureRegistry() {
  try {
    const at = Number(localStorage.getItem(AT_KEY)) || 0;
    if (readRegistryCache() && Date.now() - at < FRESH_MS) return;
    writeRegistryCache(await fetchRegistry());
  } catch {
    /* offline or server down: keep whatever copy is on the phone */
  }
}
