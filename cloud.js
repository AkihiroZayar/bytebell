// ByteBell by AkihiroLabs — Supabase sync
// Loaded lazily: if the CDN or Supabase is unreachable, ByteBell keeps working local-only.
import { state, save } from "./storage.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const CDN = "https://esm.sh/@supabase/supabase-js@2";

export const cloud = {
  configured: /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 30,
  ready: false,
  user: null,
  error: ""
};

let sb = null;
let onChange = () => {};

/* ---------- row <-> block ---------- */
const rowToBlock = r => ({
  id: r.id,
  name: r.name,
  place: r.place || "",
  days: [...r.days].map(Number).sort((a, b) => a - b),
  start: String(r.start_time).slice(0, 5),
  end: String(r.end_time).slice(0, 5),
  color: r.color,
  alert: r.alert_min === null ? null : Number(r.alert_min),
  updatedAt: r.updated_at
});

const blockToRow = b => ({
  id: b.id,
  user_id: cloud.user?.id,
  name: b.name,
  place: b.place || null,
  days: b.days,
  start_time: b.start,
  end_time: b.end,
  color: b.color,
  alert_min: b.alert === null || b.alert === undefined ? null : b.alert,
  updated_at: b.updatedAt || new Date().toISOString()
});

/* ---------- start-up ---------- */
export async function initCloud(changeCallback) {
  onChange = changeCallback;
  if (!cloud.configured) return;            // config.js not filled in yet
  try {
    const { createClient } = await import(CDN);
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, detectSessionInUrl: true } });
    cloud.ready = true;

    const { data } = await sb.auth.getSession();
    if (data?.session) await onSignedIn(data.session.user);

    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user && session.user.id !== cloud.user?.id) await onSignedIn(session.user);
      if (event === "SIGNED_OUT") { cloud.user = null; onChange(); }
    });
  } catch (e) {
    cloud.ready = false;
    cloud.error = String(e.message || e);
  }
  onChange();
}

async function onSignedIn(user) {
  cloud.user = user;
  onChange();
  await pull();
  await saveProfile();
  onChange();
}

/* ---------- auth ---------- */
export async function sendMagicLink(email) {
  if (!sb) throw new Error("Supabase is not connected.");
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.href.split("#")[0] }
  });
  if (error) throw error;
}

export async function signOut() {
  if (!sb) return;
  await sb.auth.signOut();
  cloud.user = null;
  onChange();
}

/* ---------- sync ---------- */
// Remote wins on conflict; blocks that only exist on this device are pushed up.
export async function pull() {
  if (!sb || !cloud.user) return;
  try {
    const { data, error } = await sb.from("blocks").select("*").eq("user_id", cloud.user.id);
    if (error) throw error;

    const remote = (data || []).map(rowToBlock);
    const remoteIds = new Set(remote.map(b => b.id));
    const localOnly = state.blocks.filter(b => !remoteIds.has(b.id));

    state.blocks = [...remote, ...localOnly];
    save();

    if (localOnly.length) {
      const { error: upErr } = await sb.from("blocks").upsert(localOnly.map(blockToRow));
      if (upErr) throw upErr;
    }
    cloud.error = "";
  } catch (e) {
    cloud.error = String(e.message || e);
  }
}

export async function pushBlock(block) {
  if (!sb || !cloud.user || state.demo) return;
  try {
    const { error } = await sb.from("blocks").upsert(blockToRow(block));
    if (error) throw error;
    cloud.error = "";
  } catch (e) {
    cloud.error = String(e.message || e);
  }
}

export async function deleteBlock(id) {
  if (!sb || !cloud.user || state.demo) return;
  try {
    const { error } = await sb.from("blocks").delete().eq("id", id);
    if (error) throw error;
    cloud.error = "";
  } catch (e) {
    cloud.error = String(e.message || e);
  }
}

// Time zone + language, ready for Phase 3 notifications.
export async function saveProfile() {
  if (!sb || !cloud.user) return;
  try {
    await sb.from("profiles").upsert({
      user_id: cloud.user.id,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo",
      lang: state.lang,
      updated_at: new Date().toISOString()
    });
  } catch (e) { /* not critical */ }
}
