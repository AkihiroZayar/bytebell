// ByteBell by AkihiroLabs — app state + saving
// Phase 2 will swap localStorage for Supabase here.

const STORE_KEY = "bytebell:v1";
const LANGS = ["en", "ja", "my"];
const TIME_RE = /^\d{2}:\d{2}$/;

export const state = {
  lang: "en",
  view: "today",
  blocks: [],
  presets: [],         // saved name+place quick-fill shortcuts (max 4), for the New block sheet
  demo: false,        // true while demo mode is on
  savedBlocks: null,  // the user's real blocks, kept aside during demo
  storageOK: true
};

const MAX_PRESETS = 4;

function validBlock(b) {
  return b && typeof b.id === "string" && typeof b.name === "string" && Array.isArray(b.days)
    && b.days.every(d => Number.isInteger(d) && d >= 1 && d <= 7)
    && TIME_RE.test(b.start) && TIME_RE.test(b.end);
}

function validPreset(p) {
  return p && typeof p.id === "string" && typeof p.name === "string" && p.name.trim()
    && (p.place === undefined || typeof p.place === "string");
}

export function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.blocks)) state.blocks = d.blocks.filter(validBlock);
      if (Array.isArray(d.presets)) state.presets = d.presets.filter(validPreset).slice(0, MAX_PRESETS);
      if (LANGS.includes(d.lang)) state.lang = d.lang;
      if (d.view === "week") state.view = "week";
    } else {
      const nav = (navigator.language || "").slice(0, 2);
      if (LANGS.includes(nav)) state.lang = nav;
    }
  } catch (e) {
    state.storageOK = false;
  }
}

// Remove once-blocks whose week ended before this Mon (called on app load).
export function pruneExpired(now) {
  const ws = new Date(now); ws.setHours(0,0,0,0); ws.setDate(ws.getDate()-((ws.getDay()+6)%7));
  state.blocks = state.blocks.filter(b => {
    if (!b.repeat || b.repeat !== "once" || !b.weekOf) return true;
    const bwe = new Date(b.weekOf); bwe.setHours(0,0,0,0); bwe.setDate(bwe.getDate()+7);
    return bwe > ws;   // keep if their week hasn't ended yet
  });
}

export function save() {
  // Demo blocks are never written — only the user's real schedule is saved.
  const blocks = state.demo ? (state.savedBlocks || []) : state.blocks;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, lang: state.lang, view: state.view, blocks, presets: state.presets }));
    state.storageOK = true;
  } catch (e) {
    state.storageOK = false;
  }
}
