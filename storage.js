// ByteBell by AkihiroLabs — app state + saving
// Phase 2 will swap localStorage for Supabase here.

const STORE_KEY = "bytebell:v1";
const LANGS = ["en", "ja", "my"];
const TIME_RE = /^\d{2}:\d{2}$/;

export const state = {
  lang: "en",
  view: "today",
  blocks: [],
  demo: false,        // true while demo mode is on
  savedBlocks: null,  // the user's real blocks, kept aside during demo
  storageOK: true
};

function validBlock(b) {
  return b && typeof b.id === "string" && typeof b.name === "string" && Array.isArray(b.days)
    && b.days.every(d => Number.isInteger(d) && d >= 1 && d <= 7)
    && TIME_RE.test(b.start) && TIME_RE.test(b.end);
}

export function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.blocks)) state.blocks = d.blocks.filter(validBlock);
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

export function save() {
  // Demo blocks are never written — only the user's real schedule is saved.
  const blocks = state.demo ? (state.savedBlocks || []) : state.blocks;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, lang: state.lang, view: state.view, blocks }));
    state.storageOK = true;
  } catch (e) {
    state.storageOK = false;
  }
}
