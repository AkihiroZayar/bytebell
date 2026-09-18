// ByteBell by AkihiroLabs — rendering
import { state } from "./storage.js";
import { L, t } from "./i18n.js";
import { occurrences, isoDay, pad, fmtTime, fmtMin, toMin, whenText } from "./time.js";

export const $ = s => document.querySelector(s);
export const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

export const COLORS = {
  navy:   { c: "#1E3A8A", t: "#E4EAF8" },
  amber:  { c: "#B96E0A", t: "#FCEFD9" },
  teal:   { c: "#0F766E", t: "#DDF2EF" },
  rose:   { c: "#B4325A", t: "#FBE4EB" },
  violet: { c: "#5B45B8", t: "#ECE8FA" },
  slate:  { c: "#4B5563", t: "#ECEEF1" }
};
export const ALERTS = [null, 0, 5, 10, 15, 30, 60];
export const col = key => COLORS[key] || COLORS.navy;

let firstBell = true;
let toastTimer = 0;

export function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1800);
}

function renderChrome() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("#lang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
  $("#fabLabel").textContent = t("add");
  $("#footNote").textContent = t("footNote");

  const warn = $("#warn");
  warn.hidden = state.storageOK;
  warn.textContent = t("storageWarn");

  $("#demoBar").hidden = !state.demo;
  $("#demoText").textContent = t("demoText");
  $("#exitDemo").textContent = t("demoExit");
}

function renderBell(now) {
  const el = $("#bell");
  if (!state.blocks.length) { el.hidden = true; return; }
  el.hidden = false;

  const occ = occurrences(now, 1, 8);
  const cur = occ.filter(o => o.start <= now && now < o.end).sort((a, b) => a.end - b.end)[0];
  const nxt = occ.find(o => o.start > now);

  let html = `<img src="icon.png" alt="" class="bell-byte${firstBell ? " ring" : ""}" width="38" height="38">`;
  firstBell = false;

  if (cur) {
    const pct = Math.min(100, Math.max(0, (now - cur.start) / (cur.end - cur.start) * 100));
    html += `<p class="bell-label">${t("now")}</p>
      <h2 class="bell-title">${esc(cur.block.name)}</h2>
      <p class="bell-meta">${t("until", { time: fmtTime(cur.end) })}</p>
      ${cur.block.place ? `<p class="bell-meta">${esc(cur.block.place)}</p>` : ""}
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${pct}%"></span></div>`;
  } else {
    html += `<p class="bell-label">${t("now")}</p>
      <h2 class="bell-title">${t("free")}</h2>
      <p class="bell-meta">${t("freeSub")}</p>`;
  }

  html += nxt
    ? `<div class="bell-next"><div><p class="bell-label">${t("next")}</p><strong>${esc(nxt.block.name)}</strong>${nxt.block.place ? `<span class="pl">${esc(nxt.block.place)}</span>` : ""}</div><span class="when">${whenText(nxt.start, now)}</span></div>`
    : `<div class="bell-next"><p class="bell-label">${t("noNext")}</p></div>`;

  el.innerHTML = html;
}

function renderTabs() {
  return `<div class="tabs" role="tablist">
    <button class="tab" role="tab" type="button" data-view="today" aria-selected="${state.view === "today"}">${t("today")}</button>
    <button class="tab" role="tab" type="button" data-view="week" aria-selected="${state.view === "week"}">${t("week")}</button>
  </div>`;
}

function renderToday(now) {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(d0); d1.setDate(d1.getDate() + 1);
  const occ = occurrences(now, 1, 0).filter(o => o.end > d0 && o.start < d1);
  const DAY = 864e5;

  const segs = occ.map(o => {
    const s = Math.max(o.start, d0) - d0, e = Math.min(o.end, d1) - d0;
    return `<span class="sb" style="--c:${col(o.block.color).c};left:${s / DAY * 100}%;width:${(e - s) / DAY * 100}%"></span>`;
  }).join("");
  const strip = `<div class="strip" aria-hidden="true">${segs}<span class="sn" style="left:${(now - d0) / DAY * 100}%"></span></div>
    <div class="ticks" aria-hidden="true"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>`;

  if (!occ.length) return strip + `<p class="muted">${t("todayEmpty")}</p>`;

  const items = occ.map(o => {
    const c = col(o.block.color);
    const status = now >= o.end ? "past" : (now >= o.start ? "now" : "");
    return `<li><button type="button" class="item ${status}" data-id="${esc(o.block.id)}" style="--c:${c.c};--t:${c.t}">
      <span class="time">${fmtTime(o.start)}–${fmtTime(o.end)}</span>
      <span><span class="nm">${esc(o.block.name)}</span>${o.block.place ? `<span class="pl">${esc(o.block.place)}</span>` : ""}</span>
      ${status === "now" ? `<span class="badge">${t("now")}</span>` : "<span></span>"}
    </button></li>`;
  }).join("");
  return strip + `<ul class="list">${items}</ul>`;
}

function renderWeek(now) {
  // Split blocks into per-day segments (overnight blocks continue on the next day).
  const segs = [[], [], [], [], [], [], []];
  for (const b of state.blocks) {
    const s = toMin(b.start), e = toMin(b.end);
    for (const d of b.days) {
      const i = d - 1;
      if (e > s) segs[i].push({ b, s, e });
      else {
        segs[i].push({ b, s, e: 1440 });
        if (e > 0) segs[(i + 1) % 7].push({ b, s: 0, e, cont: true });
      }
    }
  }
  // Grid range comes from real start times, so a 00:00–00:30 carry-over doesn't stretch the grid to midnight.
  const main = segs.flat().filter(x => !x.cont);
  let minH = main.length ? Math.floor(Math.min(...main.map(x => x.s)) / 60) : 8;
  let maxH = main.length ? Math.ceil(Math.max(...main.map(x => x.e)) / 60) : 22;
  if (maxH - minH < 8) { maxH = Math.min(24, minH + 8); minH = Math.max(0, maxH - 8); }
  const rows = maxH - minH;

  // Display positions: carry-over segments above the grid are pinned to the top as a small tab.
  for (const x of segs.flat()) {
    x.pinned = x.cont && x.e <= minH * 60;
    x.ds = Math.max(x.s, minH * 60);
    x.de = Math.max(Math.min(x.e, maxH * 60), x.ds + 22);
  }

  // Side-by-side lanes for overlapping segments.
  for (const all of segs) {
    const list = all.filter(x => !x.pinned);   // pinned tabs don't take a lane
    list.sort((a, b) => a.ds - b.ds || b.de - a.de);
    let cluster = [], lanes = [], clusterEnd = -1;
    const flush = () => { cluster.forEach(x => { x.cols = lanes.length; }); cluster = []; lanes = []; clusterEnd = -1; };
    for (const x of list) {
      if (cluster.length && x.ds >= clusterEnd) flush();
      let li = lanes.findIndex(end => end <= x.ds);
      if (li < 0) { li = lanes.length; lanes.push(x.de); } else lanes[li] = x.de;
      x.lane = li; cluster.push(x); clusterEnd = Math.max(clusterEnd, x.de);
    }
    flush();
  }

  const todayIdx = isoDay(now) - 1;
  const head = `<div class="week-head"><div></div>${L().daysShort.map((d, i) =>
    `<div class="dh${i === todayIdx ? " today" : ""}">${i === todayIdx ? `<span>${d}</span>` : d}</div>`).join("")}</div>`;

  let gutter = `<div class="gutter">`;
  for (let h = minH; h < maxH; h++) gutter += `<span class="hl" style="top:calc(${h - minH} * var(--hour))">${pad(h)}</span>`;
  gutter += `</div>`;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const cols = segs.map((list, i) => {
    const blocks = list.map(x => {
      const c = col(x.b.color);
      if (x.pinned) {
        return `<button type="button" class="wb pin" data-id="${esc(x.b.id)}" aria-label="${esc(`${x.b.name}, ${L().days[i]} 00:00–${fmtMin(x.e)}`)}" style="--c:${c.c};--t:${c.t}">→${fmtMin(x.e)}</button>`;
      }
      const label = `${x.b.name}, ${L().days[i]} ${fmtMin(x.s)}–${fmtMin(x.e)}`;
      return `<button type="button" class="wb" data-id="${esc(x.b.id)}" aria-label="${esc(label)}"
        style="--c:${c.c};--t:${c.t};top:calc(${x.ds / 60 - minH} * var(--hour));height:calc(${(x.de - x.ds) / 60} * var(--hour) - 2px);left:calc(${x.lane * 100 / x.cols}% + 2px);width:calc(${100 / x.cols}% - 4px)">
        ${esc(x.b.name)}<small>${fmtMin(x.s)}</small></button>`;
    }).join("");
    const line = (i === todayIdx && nowMin >= minH * 60 && nowMin <= maxH * 60)
      ? `<div class="now-line" style="top:calc(${nowMin / 60 - minH} * var(--hour))"></div>` : "";
    return `<div class="col${i === todayIdx ? " today" : ""}">${blocks}${line}</div>`;
  }).join("");

  return `<div class="week-wrap"><div class="week">${head}<div class="week-body" style="height:calc(${rows} * var(--hour))">${gutter}${cols}</div></div></div>`;
}

function renderEmpty() {
  return `<div class="empty">
    <img src="logo.png" alt="AkihiroLabs" class="byte" width="96" height="96">
    <h2>${t("emptyTitle")}</h2>
    <p>${t("emptyBody")}</p>
    <button type="button" class="btn primary" data-action="add">${t("addFirst")}</button>
  </div>`;
}

export function render() {
  const now = new Date();
  renderChrome();
  renderBell(now);
  const views = $("#views");
  if (!state.blocks.length) { views.innerHTML = renderEmpty(); return; }
  views.innerHTML = renderTabs() + (state.view === "week" ? renderWeek(now) : renderToday(now));
}
