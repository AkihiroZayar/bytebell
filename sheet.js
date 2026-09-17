// ByteBell by AkihiroLabs — add / edit sheet
import { state, save } from "./storage.js";
import { L, t } from "./i18n.js";
import { $, esc, COLORS, ALERTS, toast } from "./render.js";

let sheet, form, onChange, editingId = null;

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export function openSheet(id) {
  editingId = id || null;
  const b = id ? state.blocks.find(x => x.id === id) : null;
  const d = b || { name: "", place: "", days: [], start: "09:00", end: "17:00", color: "navy", alert: 15 };

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
      state.blocks = state.blocks.filter(x => x.id !== editingId);
      save(); sheet.close(); onChange(); toast(t("deleted"));
    }
  }
}

function onSubmit(e) {
  e.preventDefault();
  const name = $("#f-name").value.trim();
  const place = $("#f-place").value.trim();
  const days = [...form.querySelectorAll('.day[aria-pressed="true"]')].map(b => +b.dataset.day).sort((a, b) => a - b);
  const start = $("#f-start").value, end = $("#f-end").value;
  const color = (form.querySelector('input[name="color"]:checked') || {}).value || "navy";
  const av = $("#f-alert").value;
  const alert = av === "" ? null : Number(av);

  const err = !name ? t("errName") : !days.length ? t("errDays") : (!start || !end || start === end) ? t("errSame") : "";
  if (err) { $("#f-err").textContent = err; return; }

  const ts = new Date().toISOString();
  if (editingId) {
    const b = state.blocks.find(x => x.id === editingId);
    if (b) Object.assign(b, { name, place, days, start, end, color, alert, updatedAt: ts });
  } else {
    state.blocks.push({ id: uid(), name, place, days, start, end, color, alert, createdAt: ts, updatedAt: ts });
  }
  save(); sheet.close(); onChange(); toast(t("saved"));
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
