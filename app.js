// ByteBell by AkihiroLabs — entry point
import { state, load, save, pruneExpired } from "./storage.js";
import { render, $ } from "./render.js";
import { initSheet, openSheet } from "./sheet.js";
import { initDemo, refreshDemo } from "./demo.js";
import { initAuth, renderAuth } from "./auth.js";
import { initCloud, saveProfile } from "./cloud.js";
import { initPush, renderPushBtn } from "./push.js";
import { initCalendar, calNav } from "./calendar.js";

load();
pruneExpired(new Date());

const refresh = () => { render(); renderAuth(); renderPushBtn(refresh); };

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(e => console.warn("SW:", e));
}

initSheet(refresh);
initDemo(refresh);
initAuth();
initCloud(refresh);
initPush(refresh);
initCalendar(refresh);

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
  if (tab) {
    state.view = tab.dataset.view;
    // reset calendar selection to today when switching to cal view
    if (state.view === "cal") { const d=new Date(); d.setHours(0,0,0,0); calNav.selected=d; }
    save(); refresh(); return;
  }
  if (e.target.closest('[data-action="add"]')) { openSheet(); return; }
  const item = e.target.closest("[data-id]");
  if (item) openSheet(item.dataset.id);
});

// Keep Now / Next fresh.
setInterval(() => { if (!document.hidden) refresh(); }, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });

refresh();
