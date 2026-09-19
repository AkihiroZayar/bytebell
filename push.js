// ByteBell by AkihiroLabs — push subscription
import { VAPID_PUBLIC_KEY } from "./config.js";
import { state } from "./storage.js";
import { cloud } from "./cloud.js";
import { t } from "./i18n.js";
import { $, toast } from "./render.js";

export const push = {
  supported: "serviceWorker" in navigator && "PushManager" in window,
  permission: "default",   // default | granted | denied
  subscribed: false,
  iosNeedsInstall: false
};

// Detect iPhone not yet installed to home screen
function isIosNotInstalled() {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isStandalone = navigator.standalone === true;
  return isIos && !isStandalone;
}

function urlBase64ToUint8(base64) {
  const pad = "=".repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function initPush(onChange) {
  push.iosNeedsInstall = isIosNotInstalled();
  if (!push.supported || push.iosNeedsInstall) { onChange(); return; }

  push.permission = Notification.permission;
  if (push.permission === "granted") {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    push.subscribed = !!sub;
  }
  onChange();
}

export async function subscribePush(onChange) {
  if (push.iosNeedsInstall) { renderIosGuide(); return; }
  if (!push.supported) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    push.permission = await Notification.requestPermission();
    if (push.permission !== "granted") { onChange(); return; }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8(VAPID_PUBLIC_KEY)
    });
    push.subscribed = true;

    // Save subscription to Supabase if signed in
    if (cloud.user) await saveSub(sub);
    toast(t("notifOn"));
  } catch (e) {
    console.error("Push subscribe failed:", e);
    toast(t("notifFail"));
  }
  onChange();
}

export async function unsubscribePush(onChange) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      if (cloud.user) await deleteSub(sub);
    }
    push.subscribed = false;
    toast(t("notifOff"));
  } catch (e) { console.error(e); }
  onChange();
}

async function saveSub(sub) {
  if (!cloud.user) return;
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import("./config.js");
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const j = sub.toJSON();
    await sb.from("push_subscriptions").upsert({
      user_id: cloud.user.id,
      endpoint: j.endpoint,
      p256dh: j.keys?.p256dh,
      auth: j.keys?.auth,
      updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });
  } catch (e) { console.error("saveSub:", e); }
}

async function deleteSub(sub) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import("./config.js");
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  } catch (e) { console.error("deleteSub:", e); }
}

function renderIosGuide() {
  const dlg = document.createElement("dialog");
  dlg.innerHTML = `<div class="sheet">
    <h2 style="margin:0;padding:18px 18px 4px;font-size:20px;font-weight:800;color:#1E3A8A">Install ByteBell</h2>
    <div class="body" style="padding:12px 18px">
      <p>To receive notifications on iPhone, add ByteBell to your home screen first:</p>
      <ol style="padding-left:20px;line-height:2">
        <li>Tap the <strong>Share</strong> button (box with arrow) in Safari</li>
        <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
        <li>Tap <strong>Add</strong></li>
        <li>Open ByteBell from your home screen and try again</li>
      </ol>
    </div>
    <div class="actions" style="padding:12px 18px 24px;border-top:1px solid #E3E7EF">
      <button class="btn primary" style="flex:1" onclick="this.closest('dialog').close()">Got it</button>
    </div>
  </div>`;
  dlg.style.cssText = "border:0;padding:0;border-radius:22px;width:calc(100% - 24px);max-width:520px;max-height:92vh;color:#2B2F36";
  document.body.appendChild(dlg);
  dlg.showModal();
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
}

export function renderPushBtn(onChange) {
  let btn = $("#pushBtn");
  if (!btn) return;

  if (push.iosNeedsInstall) {
    btn.hidden = false;
    btn.textContent = t("notifInstall");
    btn.onclick = () => renderIosGuide();
    return;
  }
  if (!push.supported) { btn.hidden = true; return; }
  if (push.permission === "denied") {
    btn.hidden = false;
    btn.textContent = t("notifDenied");
    btn.disabled = true;
    return;
  }
  btn.hidden = false;
  btn.disabled = false;
  btn.textContent = push.subscribed ? t("notifOff") : t("notifOn");
  btn.onclick = push.subscribed
    ? () => unsubscribePush(onChange)
    : () => subscribePush(onChange);
}
