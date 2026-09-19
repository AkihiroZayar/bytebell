// ByteBell by AkihiroLabs — time helpers
import { state } from "./storage.js";
import { L, t } from "./i18n.js";

export const toMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
export const isoDay = d => ((d.getDay() + 6) % 7) + 1;          // Mon=1 … Sun=7
export const pad = n => String(n).padStart(2, "0");
export const fmtTime = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmtMin = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

// Returns the Mon 00:00 of the week containing `date`.
export function weekStart(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // back to Monday
  return d;
}
export function weekEnd(date) {
  const ws = weekStart(date);
  const we = new Date(ws); we.setDate(ws.getDate() + 7); // Sun 24:00 = next Mon 00:00
  return we;
}

// Real dated occurrences of every block, from `back` days ago to `fwd` days ahead.
// Overnight blocks (end <= start) finish on the next day.
// "once" blocks are only generated within their saved week (weekOf ISO string Mon).
export function occurrences(now, back, fwd) {
  const out = [];
  const base = new Date(now); base.setHours(0, 0, 0, 0);
  const ws = weekStart(now), we = weekEnd(now);
  for (let off = -back; off <= fwd; off++) {
    const day = new Date(base); day.setDate(base.getDate() + off);
    const dow = isoDay(day);
    for (const b of state.blocks) {
      if (!b.days.includes(dow)) continue;
      // "once" blocks only appear in the week they were created (weekOf = Mon ISO date)
      if (b.repeat === "once") {
        if (!b.weekOf) continue;
        const bws = new Date(b.weekOf); bws.setHours(0,0,0,0);
        const bwe = new Date(bws); bwe.setDate(bws.getDate() + 7);
        if (day < bws || day >= bwe) continue;
      }
      const s = toMin(b.start), e = toMin(b.end);
      const start = new Date(day); start.setHours(0, s, 0, 0);
      const end = new Date(day); end.setHours(0, e <= s ? e + 1440 : e, 0, 0);
      out.push({ block: b, start, end });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

// All "once" blocks whose week has fully passed (we < now's week start).
export function expiredOnce(now) {
  const ws = weekStart(now);
  return state.blocks.filter(b => {
    if (b.repeat !== "once" || !b.weekOf) return false;
    const bwe = new Date(b.weekOf); bwe.setHours(0,0,0,0); bwe.setDate(bwe.getDate() + 7);
    return bwe <= ws;
  });
}

// "once" blocks that belong to the current week (for Done section).
export function thisWeekOnce(now) {
  const ws = weekStart(now), we = weekEnd(now);
  return state.blocks.filter(b => {
    if (b.repeat !== "once" || !b.weekOf) return false;
    const bws = new Date(b.weekOf); bws.setHours(0,0,0,0);
    return bws >= ws && bws < we;
  });
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
