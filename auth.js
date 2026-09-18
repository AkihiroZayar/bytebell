// ByteBell by AkihiroLabs — login UI (magic link)
import { t } from "./i18n.js";
import { $, esc, toast } from "./render.js";
import { cloud, sendMagicLink, signOut } from "./cloud.js";

let dlg, body, btn;

export function renderAuth() {
  if (!btn) return;
  btn.hidden = !cloud.configured;
  btn.textContent = cloud.user ? t("account") : t("signIn");
}

function renderDialog(stateKey = "idle", msg = "") {
  if (cloud.user) {
    body.innerHTML = `
      <h2>${t("account")}</h2>
      <div class="body">
        <p class="muted">${t("signedInAs")}</p>
        <p><strong>${esc(cloud.user.email || "")}</strong></p>
        <p class="muted">${t("syncNote")}</p>
        ${cloud.error ? `<p class="err">${esc(cloud.error)}</p>` : ""}
      </div>
      <div class="actions">
        <button type="button" class="btn" data-a="close">${t("close")}</button>
        <button type="button" class="btn primary" data-a="signout">${t("signOut")}</button>
      </div>`;
    return;
  }

  body.innerHTML = `
    <h2>${t("signIn")}</h2>
    <div class="body">
      <p class="muted">${t("signInNote")}</p>
      <div class="field"><label class="lbl" for="a-email">${t("email")}</label>
        <input class="input" id="a-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com"></div>
      <p class="${stateKey === "error" ? "err" : "hint"}" id="a-msg">${esc(msg)}</p>
    </div>
    <div class="actions">
      <button type="button" class="btn" data-a="close">${t("cancel")}</button>
      <button type="button" class="btn primary" data-a="send" ${stateKey === "sending" ? "disabled" : ""}>${stateKey === "sending" ? t("sending") : t("sendLink")}</button>
    </div>`;
}

async function onClick(e) {
  const a = e.target.closest("[data-a]")?.dataset.a;
  if (!a) return;

  if (a === "close") dlg.close();

  if (a === "signout") {
    await signOut();
    dlg.close();
    renderAuth();
    toast(t("signedOut"));
  }

  if (a === "send") {
    const email = $("#a-email").value.trim();
    if (!email || !email.includes("@")) { renderDialog("error", t("errEmail")); return; }
    renderDialog("sending");
    try {
      await sendMagicLink(email);
      renderDialog("idle", t("linkSent"));
    } catch (err) {
      renderDialog("error", String(err.message || err));
    }
  }
}

export function initAuth() {
  btn = $("#authBtn");
  dlg = $("#authDlg");
  body = $("#authBody");
  btn.addEventListener("click", () => { renderDialog(); dlg.showModal(); });
  body.addEventListener("click", onClick);
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  renderAuth();
}
