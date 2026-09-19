// ByteBell by AkihiroLabs — add / edit sheet
import { state, save } from "./storage.js";
import { L, t } from "./i18n.js";
import { $, esc, COLORS, ALERTS, toast } from "./render.js";
import { pushBlock, deleteBlock } from "./cloud.js";
import { weekStart } from "./time.js";
import { renderDatePicker } from "./calendar.js";

let sheet, form, onChange, editingId = null;

// Always a UUID — Supabase stores block ids as uuid.
const uid = () => crypto.randomUUID
  ? crypto.randomUUID()
  : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

export function openSheet(id) {
  editingId = id || null;
  const b = id ? state.blocks.find(x => x.id === id) : null;
  const d = b || { name: "", place: "", days: [], start: "09:00", end: "17:00", color: "navy", alert: 15, repeat: "weekly" };

  const dayChips = L().daysShort.map((label, i) =>
    `<button type="button" class="chip day" data-day="${i + 1}" aria-pressed="${d.days.includes(i + 1)}" aria-label="${esc(L().days[i])}">${label}</button>`).join("");
  const swatches = Object.entries(COLORS).map(([key, c]) =>
    `<label class="swatch" style="--c:${c.c}"><input type="radio" name="color" value="${key}" aria-label="${key}" ${d.color === key ? "checked" : ""}><span></span></label>`).join("");
  const alertOpts = ALERTS.map(v => {
    const label = v === null ? t("noRemind") : v === 0 ? t("atStart") : t("before", { n: v });
    const sel = (d.alert ?? null) === v ? "selected" : "";
    return `<option value="${v === null ? "" : v}" ${sel}>${label}</option>`;
  }).join("");

  form.innerHTML = `
    <h2 id="sheetTitle">${b ? t("editTitle") : t("newTitle")}</h2>
    <div class="body">
      <div class="field"><label for="f-name">${t("name")}</label>
        <input class="input" id="f-name" maxlength="40" autocomplete="off" placeholder="${esc(t("namePh"))}" value="${esc(d.name)}"></div>
      <div class="field"><label for="f-place">${t("place")}</label>
        <input class="input" id="f-place" maxlength="40" autocomplete="off" placeholder="${esc(t("placePh"))}" value="${esc(d.place || "")}"></div>
      <div class="field">
        <span class="lbl">${t("weeklyPattern")} / ${t("pickDates")}</span>
        <div class="toggle-group" role="group">
          <button type="button" class="tog mode-tog ${(d.repeat||"weekly")!=="dates"?"active":""}" data-mode="weekly">${t("weeklyPattern")}</button>
          <button type="button" class="tog mode-tog ${(d.repeat||"weekly")==="dates"?"active":""}" data-mode="dates">${t("pickDates")}</button>
        </div>
      </div>

      <div id="weekly-section" ${(d.repeat||"weekly")==="dates"?'hidden':''}>
      <div class="field">
        <span class="lbl">${t("repeatMode")}</span>
        <div class="toggle-group" role="group">
          <button type="button" class="tog ${(d.repeat||'weekly')==='weekly'?'active':''}" data-tog="weekly">${t("everyWeek")}</button>
          <button type="button" class="tog ${(d.repeat||'weekly')==='once'?'active':''}" data-tog="once">${t("thisWeekOnly")}</button>
        </div>
      </div>
      <div class="field"><span class="lbl" id="daysLbl">${t("repeats")}</span>
        <div class="chips" role="group" aria-labelledby="daysLbl">${dayChips}
          <button type="button" class="chip quick" data-quick="weekdays">${t("weekdays")}</button>
          <button type="button" class="chip quick" data-quick="all">${t("everyday")}</button>
        </div></div>
      <div class="field">
        <div class="row2">
          <div><label class="lbl" for="f-start">${t("starts")}</label><input class="input" type="time" id="f-start" value="${d.start}"></div>
          <div><label class="lbl" for="f-end">${t("ends")}</label><input class="input" type="time" id="f-end" value="${d.end}"></div>
        </div>
        <p class="hint" id="overnight" hidden>${t("overnight")}</p>
      </div>
      </div><!-- /weekly-section -->

      <div id="dates-section" ${(d.repeat||"weekly")!=="dates"?'hidden':''}>
        <div class="field" id="datepicker-wrap">
          ${renderDatePicker(new Set(Array.isArray(d.dates)?d.dates:[]))}
        </div>
      </div>

      <div class="field"><span class="lbl" id="colorLbl">${t("color")}</span>
        <div class="swatches" role="radiogroup" aria-labelledby="colorLbl">${swatches}</div></div>
      <div class="field"><label for="f-alert">${t("remind")}</label>
        <select class="input" id="f-alert">${alertOpts}</select></div>
      <p class="err" id="f-err" role="alert"></p>
    </div>
    <div class="actions">
      ${b ? `<button type="button" class="btn danger" data-action="delete">${t("del")}</button>` : ""}
      <button type="button" class="btn" data-action="cancel">${t("cancel")}</button>
      <button type="submit" class="btn primary">${t("save")}</button>
    </div>`;

  updateOvernight();
  sheet.showModal();
  if (!b) setTimeout(() => $("#f-name").focus(), 30);
}

function updateOvernight() {
  const s = $("#f-start").value, e = $("#f-end").value;
  $("#overnight").hidden = !(s && e && e < s);
}

function onClick(e) {
  const modeTog = e.target.closest("[data-mode]");
  if (modeTog) {
    form.querySelectorAll(".mode-tog").forEach(b => b.classList.remove("active"));
    modeTog.classList.add("active");
    const isWeekly = modeTog.dataset.mode !== "dates";
    form.querySelector("#weekly-section").hidden = !isWeekly;
    form.querySelector("#dates-section").hidden = isWeekly;
    return;
  }
  // date-picker day tap
  const pd = e.target.closest("[data-pick]");
  if (pd) {
    pd.classList.toggle("cal-sel");
    return;
  }
  const tog = e.target.closest("[data-tog]");
  if (tog) {
    form.querySelectorAll(".tog:not(.mode-tog)").forEach(b => b.classList.remove("active"));
    tog.classList.add("active");
    return;
  }
  const day = e.target.closest(".day");
  if (day) { day.setAttribute("aria-pressed", String(day.getAttribute("aria-pressed") !== "true")); return; }

  const quick = e.target.closest("[data-quick]");
  if (quick) {
    const set = quick.dataset.quick === "weekdays" ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7];
    form.querySelectorAll(".day").forEach(b => b.setAttribute("aria-pressed", String(set.includes(+b.dataset.day))));
    return;
  }

  const act = e.target.closest("[data-action]");
  if (!act) return;
  if (act.dataset.action === "cancel") sheet.close();
  if (act.dataset.action === "delete") {
    const b = state.blocks.find(x => x.id === editingId);
    if (b && confirm(t("confirmDel", { name: b.name }))) {
      const removedId = editingId;
      state.blocks = state.blocks.filter(x => x.id !== removedId);
      save(); sheet.close(); onChange(); toast(t("deleted"));
      deleteBlock(removedId);
    }
  }
}

function onSubmit(e) {
  e.preventDefault();
  const name = $("#f-name").value.trim();
  const place = $("#f-place").value.trim();
  const days = [...form.querySelectorAll('.day[aria-pressed="true"]')].map(b => +b.dataset.day).sort((a, b) => a - b);
  const start = $("#f-start").value, end = $("#f-end").value;
  const modeActive = form.querySelector(".mode-tog.active")?.dataset?.mode || "weekly";
  const repeat = modeActive === "dates" ? "dates"
    : (form.querySelector(".tog:not(.mode-tog).active") || {}).dataset?.tog || "weekly";
  const dates = repeat === "dates"
    ? [...form.querySelectorAll(".pick-day.cal-sel")].map(b => b.dataset.pick)
    : null;
  const color = (form.querySelector('input[name="color"]:checked') || {}).value || "navy";
  const av = $("#f-alert").value;
  const alert = av === "" ? null : Number(av);

  const err = !name ? t("errName") : !days.length ? t("errDays") : (!start || !end || start === end) ? t("errSame") : "";
  if (err) { $("#f-err").textContent = err; return; }

  const ts = new Date().toISOString();
  if (repeat === "dates" && (!dates || !dates.length)) { $("#f-err").textContent = t("errDays"); return; }
  const weekOf = repeat === "once"
    ? (() => { const ws = weekStart(new Date()); return `${ws.getFullYear()}-${String(ws.getMonth()+1).padStart(2,"0")}-${String(ws.getDate()).padStart(2,"0")}`; })()
    : null;
  let block;
  if (editingId) {
    block = state.blocks.find(x => x.id === editingId);
    if (block) Object.assign(block, { name, place, days: repeat==="dates"?[]:days, dates: dates||block.dates||null, start, end, color, alert, repeat, weekOf, updatedAt: ts });
  } else {
    block = { id: uid(), name, place, days: repeat==="dates"?[]:days, dates: dates||null, start, end, color, alert, repeat, weekOf, createdAt: ts, updatedAt: ts };
    state.blocks.push(block);
  }
  save(); sheet.close(); onChange(); toast(t("saved"));
  if (block) pushBlock(block);
}

export function initSheet(changeCallback) {
  onChange = changeCallback;
  sheet = $("#sheet");
  form = $("#blockForm");
  form.addEventListener("click", onClick);
  form.addEventListener("input", e => { if (e.target.type === "time") updateOvernight(); });
  form.addEventListener("submit", onSubmit);
  sheet.addEventListener("click", e => { if (e.target === sheet) sheet.close(); });
}
