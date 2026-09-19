// ByteBell by AkihiroLabs — calendar view + date picker
import { state } from "./storage.js";
import { L, t } from "./i18n.js";
import { $, esc, col, toast } from "./render.js";
import { isoDay, toMin, fmtTime, pad, occurrences, weekStart } from "./time.js";

/* ── helpers ─────────────────────────────────────────────── */
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const sameDay = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

/* ── shared nav state ────────────────────────────────────── */
export const calNav = {
  // Month grid: year + month being viewed
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  // Selected day shown in detail panel (defaults to today)
  selected: today()
};

function setSelected(d, onChange) {
  calNav.selected = d;
  onChange();
}

/* ── month grid ─────────────────────────────────────────── */
// Returns a Set of dateKey strings that have at least one block occurrence
function dotDays(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month+1, 0);
  // look ±1 day for overnight blocks
  const now = new Date(); now.setHours(12,0,0,0);
  const tmp = new Date(now); // doesn't matter — occurrences uses state.blocks
  // generate for the whole month
  const days = new Set();
  const base = new Date(first); base.setDate(base.getDate()-1);
  for (let off = 0; off <= last.getDate()+1; off++) {
    const d = new Date(base); d.setDate(base.getDate()+off);
    if (d.getMonth() !== month && d.getMonth() !== (month+1)%12) {
      // only check days in this month
    }
    const dow = isoDay(d);
    for (const b of state.blocks) {
      if (!b.days.includes(dow)) continue;
      if (b.repeat === "once" && b.weekOf) {
        const ws = new Date(b.weekOf); ws.setHours(0,0,0,0);
        const we = new Date(ws); we.setDate(ws.getDate()+7);
        if (d < ws || d >= we) continue;
      }
      if (d.getMonth() === month) days.add(dateKey(d));
    }
    // specific-date blocks
    for (const b of state.blocks) {
      if (b.repeat === "dates" && Array.isArray(b.dates)) {
        b.dates.forEach(dk => { if (dk.startsWith(`${year}-${pad(month+1)}`)) days.add(dk); });
      }
    }
  }
  return days;
}

export function renderMonthGrid(onChange) {
  const { year, month, selected } = calNav;
  const td = today();
  const monthNames = {
    en:["January","February","March","April","May","June","July","August","September","October","November","December"],
    ja:["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
    my:["ဇန်နဝါရီ","ဖေဖော်ဝါရီ","မတ်","ဧပြီ","မေ","ဇွန်","ဇူလိုင်","သြဂုတ်","စက်တင်ဘာ","အောက်တိုဘာ","နိုဝင်ဘာ","ဒီဇင်ဘာ"]
  };
  const mName = (monthNames[state.lang]||monthNames.en)[month];
  const dots = dotDays(year, month);

  // Build calendar grid (Mon–Sun)
  const firstDow = ((new Date(year,month,1).getDay()+6)%7); // 0=Mon
  const daysInMonth = new Date(year,month+1,0).getDate();
  const cells = [];
  for (let i=0;i<firstDow;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(d);
  while (cells.length%7!==0) cells.push(null);

  const headCells = L().daysShort.map(d=>`<th>${esc(d)}</th>`).join("");
  const rows = [];
  for (let r=0;r<cells.length/7;r++) {
    const tds = cells.slice(r*7,r*7+7).map(d => {
      if (!d) return `<td></td>`;
      const date = new Date(year,month,d);
      const isToday = sameDay(date,td);
      const isSel = sameDay(date,selected);
      const hasDot = dots.has(dateKey(date));
      const cls = [isToday?"cal-today":"", isSel?"cal-sel":""].filter(Boolean).join(" ");
      return `<td><button type="button" class="cal-day ${cls}" data-date="${dateKey(date)}">${d}${hasDot?`<span class="cal-dot"></span>`:""}</button></td>`;
    }).join("");
    rows.push(`<tr>${tds}</tr>`);
  }

  return `<div class="cal-nav">
    <button type="button" class="cal-arr" data-cm="-1">&#8249;</button>
    <button type="button" class="cal-title" data-cm="0">${esc(mName)} ${year}</button>
    <button type="button" class="cal-arr" data-cm="1">&#8250;</button>
  </div>
  <table class="cal-grid" role="grid">
    <thead><tr>${headCells}</tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table>`;
}

/* ── day detail ──────────────────────────────────────────── */
export function renderDayDetail(now) {
  const { selected } = calNav;
  const td = today();
  const label = sameDay(selected,td)
    ? t("today")
    : `${L().days[isoDay(selected)-1]}, ${selected.getDate()} ${
        ({en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
          ja:["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
          my:["ဇန်","ဖေ","မတ်","ဧ","မေ","ဇွန်","ဇူ","သြ","စက်","အောက်","နို","ဒီ"]}[state.lang]||[])[selected.getMonth()]
      } ${selected.getFullYear()}`;

  const d0 = new Date(selected); d0.setHours(0,0,0,0);
  const d1 = new Date(d0); d1.setDate(d1.getDate()+1);

  // Collect occurrences for this day
  const occ = occurrences(selected, 1, 1).filter(o => o.end > d0 && o.start < d1);

  // Also include specific-date blocks
  const dk = dateKey(selected);
  for (const b of state.blocks) {
    if (b.repeat === "dates" && Array.isArray(b.dates) && b.dates.includes(dk)) {
      const s = toMin(b.start), e = toMin(b.end);
      const start = new Date(d0); start.setHours(0,s,0,0);
      const end   = new Date(d0); end.setHours(0, e<=s?e+1440:e, 0, 0);
      if (!occ.find(o=>o.block.id===b.id)) occ.push({block:b,start,end});
    }
  }
  occ.sort((a,b)=>a.start-b.start);

  const items = occ.length ? occ.map(o => {
    const c = col(o.block.color);
    const status = now>=o.end?"past":(now>=o.start?"now":"");
    return `<li><button type="button" class="item ${status}" data-id="${esc(o.block.id)}" style="--c:${c.c};--t:${c.t}">
      <span class="time">${fmtTime(o.start)}–${fmtTime(o.end)}</span>
      <span><span class="nm">${esc(o.block.name)}</span>${o.block.place?`<span class="pl">${esc(o.block.place)}</span>`:""}</span>
      ${status==="now"?`<span class="badge">${t("now")}</span>`:o.block.repeat==="once"?`<span class="badge once">${t("thisWeekBadge")}</span>`:`<span></span>`}
    </button></li>`;
  }).join("") : `<li><p class="muted">${t("todayEmpty")}</p></li>`;

  return `<div class="day-header"><span class="day-label">${esc(label)}</span></div>
    <ul class="list">${items}</ul>`;
}

/* ── date-picker for sheet ───────────────────────────────── */
// selectedDates: Set of dateKey strings
export function renderDatePicker(selectedDates) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const firstDow = ((new Date(year,month,1).getDay()+6)%7);
  const daysInMonth = new Date(year,month+1,0).getDate();
  const cells = [];
  for (let i=0;i<firstDow;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(d);
  while(cells.length%7!==0) cells.push(null);
  const headCells = L().daysShort.map(d=>`<th>${esc(d)}</th>`).join("");
  const rows=[];
  for(let r=0;r<cells.length/7;r++){
    const tds=cells.slice(r*7,r*7+7).map(d=>{
      if(!d) return `<td></td>`;
      const dk=`${year}-${pad(month+1)}-${pad(d)}`;
      const sel=selectedDates.has(dk);
      return `<td><button type="button" class="cal-day pick-day ${sel?"cal-sel":""}" data-pick="${dk}">${d}</button></td>`;
    }).join("");
    rows.push(`<tr>${tds}</tr>`);
  }
  const monthNames={en:["January","February","March","April","May","June","July","August","September","October","November","December"],ja:["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],my:["ဇန်နဝါရီ","ဖေဖော်ဝါရီ","မတ်","ဧပြီ","မေ","ဇွန်","ဇူလိုင်","သြဂုတ်","စက်တင်ဘာ","အောက်တိုဘာ","နိုဝင်ဘာ","ဒီဇင်ဘာ"]};
  return `<p class="lbl">${(monthNames[state.lang]||monthNames.en)[month]} ${year} — ${t("tapDates")}</p>
    <table class="cal-grid pick-grid" role="grid">
      <thead><tr>${headCells}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>`;
}

/* ── calendar event wiring (called from app.js) ──────────── */
export function initCalendar(onChange) {
  // Month grid nav + day selection (delegated on #views)
  document.getElementById("views").addEventListener("click", e => {
    const cm = e.target.closest("[data-cm]");
    if (cm) {
      const v = +cm.dataset.cm;
      if (v === 0) { calNav.year=new Date().getFullYear(); calNav.month=new Date().getMonth(); calNav.selected=today(); }
      else { calNav.month+=v; if(calNav.month>11){calNav.month=0;calNav.year++;} if(calNav.month<0){calNav.month=11;calNav.year--;} }
      onChange(); return;
    }
    const cd = e.target.closest("[data-date]");
    if (cd) { const [y,m,d]=cd.dataset.date.split("-").map(Number); calNav.selected=new Date(y,m-1,d); onChange(); }
  });
}
