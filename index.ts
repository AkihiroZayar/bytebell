// ByteBell by AkihiroLabs — Edge Function: send-notifications
// Deploy: supabase functions deploy send-notifications
// Triggered every minute by pg_cron (see schema.sql cron job below).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUB    = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIV   = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUB    = Deno.env.get("VAPID_SUBJECT")!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

/* ── helpers ──────────────────────────────────────────────── */
function toMin(t: string) { const [h,m]=t.split(":").map(Number); return h*60+m; }
function nowInTZ(tz: string) {
  return new Date(new Date().toLocaleString("en-US",{timeZone:tz}));
}
function isoDay(d: Date) { return ((d.getDay()+6)%7)+1; } // Mon=1

function blockFiresNow(block: any, alertMin: number, now: Date) {
  const dow = isoDay(now); const nowMins = now.getHours()*60+now.getMinutes();
  if (!block.days?.includes(dow)) return false;
  const target = toMin(block.start) - alertMin;
  return nowMins === target;
}

/* ── VAPID JWT ────────────────────────────────────────────── */
async function makeVapidJwt(endpoint: string): Promise<string> {
  const origin = new URL(endpoint).origin;
  const header = btoa(JSON.stringify({typ:"JWT",alg:"ES256"}));
  const now = Math.floor(Date.now()/1000);
  const payload = btoa(JSON.stringify({aud:origin,exp:now+43200,sub:VAPID_SUB}));
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToBuf(VAPID_PRIV),
    {name:"ECDSA",namedCurve:"P-256"}, false, ["sign"]
  );
  const sig = await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"}, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

function pemToBuf(pem: string) {
  const b64 = pem.replace(/-----[^-]+-----/g,"").replace(/\s/g,"");
  const bin = atob(b64); return Uint8Array.from(bin, c=>c.charCodeAt(0)).buffer;
}

/* ── send one push ────────────────────────────────────────── */
async function sendPush(sub: any, payload: object): Promise<boolean> {
  try {
    const jwt = await makeVapidJwt(sub.endpoint);
    const body = JSON.stringify(payload);
    const res = await fetch(sub.endpoint, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`vapid t=${jwt},k=${VAPID_PUB}`,
        "TTL":"60"
      },
      body
    });
    if (res.status === 410 || res.status === 404) return false; // expired sub
    return res.ok;
  } catch { return true; } // network error — keep sub
}

/* ── main ─────────────────────────────────────────────────── */
Deno.serve(async () => {
  // Get all subscriptions with their user's profile (tz, lang) and blocks
  const { data: subs } = await sb.from("push_subscriptions").select("*");
  if (!subs?.length) return new Response("ok");

  const toDelete: string[] = [];

  for (const sub of subs) {
    const { data: profile } = await sb.from("profiles").select("tz,lang").eq("user_id",sub.user_id).single();
    const tz = profile?.tz || "Asia/Tokyo";
    const now = nowInTZ(tz);
    const { data: blocks } = await sb.from("blocks").select("*").eq("user_id",sub.user_id);
    if (!blocks?.length) continue;

    for (const block of blocks) {
      const alertMin = block.alert_min ?? 15;
      if (!blockFiresNow(block, alertMin, now)) continue;

      // Avoid duplicate: check sent-log
      const logKey = `${sub.id}:${block.id}:${now.toISOString().slice(0,16)}`;
      const { data: already } = await sb.from("notif_log").select("id").eq("log_key",logKey).maybeSingle();
      if (already) continue;

      const title = block.name;
      const body  = alertMin === 0
        ? `Starting now${block.place ? ` · ${block.place}` : ""}`
        : `Starts in ${alertMin} min${block.place ? ` · ${block.place}` : ""}`;

      const ok = await sendPush(sub, { title, body, icon:"./icon.png", tag: block.id });
      if (!ok) { toDelete.push(sub.id); break; }
      await sb.from("notif_log").insert({ log_key: logKey, user_id: sub.user_id, block_id: block.id });
    }
  }

  if (toDelete.length) await sb.from("push_subscriptions").delete().in("id", toDelete);
  return new Response("ok");
});
