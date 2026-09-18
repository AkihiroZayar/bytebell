// ByteBell by AkihiroLabs — entry point
import { state, load, save } from "./storage.js";
import { render, $ } from "./render.js";
import { initSheet, openSheet } from "./sheet.js";
import { initDemo, refreshDemo } from "./demo.js";
import { initAuth, renderAuth } from "./auth.js";
import { initCloud, saveProfile } from "./cloud.js";

load();

const refresh = () => { render(); renderAuth(); };

initSheet(refresh);
initDemo(refresh);
initAuth();
initCloud(refresh);

$("#lang").addEventListener("click", e => {
  const b = e.target.closest("[data-lang]");
  if (!b) return;
  state.lang = b.dataset.lang;
  refreshDemo();
  save();
  refresh();
  saveProfile();
});

$("#fab").addEventListener("click", () => openSheet());

$("#views").addEventListener("click", e => {
  const tab = e.target.closest("[data-view]");
  if (tab) { state.view = tab.dataset.view; save(); refresh(); return; }
  if (e.target.closest('[data-action="add"]')) { openSheet(); return; }
  const item = e.target.closest("[data-id]");
  if (item) openSheet(item.dataset.id);
});

// Keep Now / Next fresh.
setInterval(() => { if (!document.hidden) refresh(); }, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });

refresh();
