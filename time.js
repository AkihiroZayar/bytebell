// ByteBell by AkihiroLabs — time helpers
import { state } from "./storage.js";
import { L, t } from "./i18n.js";

export const toMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
export const isoDay = d => ((d.getDay() + 6) % 7) + 1;          // Mon=1 … Sun=7
export const pad = n => String(n).padStart(2, "0");
export const fmtTime = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmtMin = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

// Real dated occurrences of every block, from `back` days ago to `fwd` days ahead.
// Overnight blocks (end <= start) finish on the next day.
export function occurrences(now, back, fwd) {
  const out = [];
  const base = new Date(now); base.setHours(0, 0, 0, 0);
  for (let off = -back; off <= fwd; off++) {
    const day = new Date(base); day.setDate(base.getDate() + off);
    const dow = isoDay(day);
    for (const b of state.blocks) {
      if (!b.days.includes(dow)) continue;
      const s = toMin(b.start), e = toMin(b.end);
      const start = new Date(day); start.setHours(0, s, 0, 0);
      const end = new Date(day); end.setHours(0, e <= s ? e + 1440 : e, 0, 0);
      out.push({ block: b, start, end });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export function durText(ms) {
  const total = Math.max(1, Math.ceil(ms / 60000));
  return L().dur(Math.floor(total / 60), total % 60);
}

export function whenText(start, now) {
  const diff = start - now;
  if (diff < 12 * 3600e3) return t("startsIn", { dur: durText(diff) });
  const tmr = new Date(now); tmr.setHours(0, 0, 0, 0); tmr.setDate(tmr.getDate() + 1);
  const isTmr = start.getFullYear() === tmr.getFullYear() && start.getMonth() === tmr.getMonth() && start.getDate() === tmr.getDate();
  const day = isTmr ? t("tomorrow") : L().days[isoDay(start) - 1];
  return t("on", { day, time: fmtTime(start) });
}
