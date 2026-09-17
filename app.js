// ByteBell by AkihiroLabs — entry point
import { state, load, save } from "./storage.js";
import { render, $ } from "./render.js";
import { initSheet, openSheet } from "./sheet.js";
import { initDemo, refreshDemo } from "./demo.js";

load();
initSheet(render);
initDemo(render);

$("#lang").addEventListener("click", e => {
  const b = e.target.closest("[data-lang]");
  if (!b) return;
  state.lang = b.dataset.lang;
  refreshDemo();
  save();
  render();
});

$("#fab").addEventListener("click", () => openSheet());

$("#views").addEventListener("click", e => {
  const tab = e.target.closest("[data-view]");
  if (tab) { state.view = tab.dataset.view; save(); render(); return; }
  if (e.target.closest('[data-action="add"]')) { openSheet(); return; }
  const item = e.target.closest("[data-id]");
  if (item) openSheet(item.dataset.id);
});

// Keep Now / Next fresh.
setInterval(() => { if (!document.hidden) render(); }, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

render();
