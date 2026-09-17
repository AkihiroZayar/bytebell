// ByteBell by AkihiroLabs — demo mode
// Tap the 🦝 logo 3 times (within 1.5 s) to toggle a sample week.
// Demo blocks live in memory only; the user's real schedule is never overwritten.
import { state } from "./storage.js";
import { L, t } from "./i18n.js";
import { $, toast } from "./render.js";

const TAP_WINDOW = 1500;

const SAMPLE = [
  { key: "school",    days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00", color: "navy",   alert: 10 },
  { key: "work",      days: [1, 2, 3, 4, 5], start: "18:00", end: "22:30", color: "amber",  alert: 15 },
  { key: "study",     days: [2, 4],          start: "23:00", end: "00:30", color: "violet", alert: 5 },   // overnight example
  { key: "gym",       days: [6],             start: "10:00", end: "11:30", color: "teal",   alert: 30 },
  { key: "groceries", days: [7],             start: "14:00", end: "15:00", color: "rose",   alert: null }
];

function buildSample() {
  const names = L().demo;
  return SAMPLE.map(s => ({
    id: `demo-${s.key}`,
    name: names[s.key][0],
    place: names[s.key][1],
    days: [...s.days],
    start: s.start, end: s.end, color: s.color, alert: s.alert
  }));
}

export function enterDemo() {
  if (state.demo) return;
  state.savedBlocks = state.blocks;
  state.blocks = buildSample();
  state.demo = true;
  toast(t("demoOn"));
}

export function exitDemo() {
  if (!state.demo) return;
  state.blocks = state.savedBlocks || [];
  state.savedBlocks = null;
  state.demo = false;
  toast(t("demoOff"));
}

// After a language switch, translate sample blocks the user hasn't edited.
export function refreshDemo() {
  if (!state.demo) return;
  const fresh = buildSample();
  state.blocks = state.blocks.map(b => {
    const f = fresh.find(x => x.id === b.id);
    return f && !b.updatedAt ? { ...b, name: f.name, place: f.place } : b;
  });
}

export function initDemo(onChange) {
  const logo = $("#logo");
  let taps = [];

  logo.addEventListener("click", () => {
    const now = Date.now();
    taps = taps.filter(x => now - x < TAP_WINDOW);
    taps.push(now);

    logo.classList.remove("tap");
    void logo.offsetWidth;            // restart the tap animation
    logo.classList.add("tap");

    if (taps.length >= 3) {
      taps = [];
      state.demo ? exitDemo() : enterDemo();
      onChange();
    }
  });

  $("#exitDemo").addEventListener("click", () => { exitDemo(); onChange(); });
}
