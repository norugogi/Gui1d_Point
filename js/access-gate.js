(function () {
  const ADMIN_KEY = "gui1d_admin_logged_in";
  const NICK_REGEX = /^[a-zA-Z\uAC00-\uD7A3]{2,10}$/;

  const TXT = {
    title: "\uB0B4\uBD80 \uC804\uC6A9 \uD398\uC774\uC9C0",
    desc: "\uC811\uC18D\uC744 \uC704\uD574 \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694.",
    emailPh: "\uC774\uBA54\uC77C\uC8FC\uC18C",
    pwPh: "\uC554\uD638",
    showPw: "\uBE44\uBC00\uBC88\uD638 \uBCF4\uAE30",
    login: "\uB85C\uADF8\uC778",
    signup: "\uD68C\uC6D0\uAC00\uC785",
    reset: "\uBE44\uBC00\uBC88\uD638 \uCC3E\uAE30",
    signupTitle: "\uD68C\uC6D0\uAC00\uC785",
    nickPh: "\uC778\uAC8C\uC784 \uB2C9\uB124\uC784",
    signupMsg: "\uAC00\uC785 \uD6C4 \uBE60\uB974\uAC8C \uC2B9\uC778\uD574\uB4DC\uB9AC\uACA0\uC2B5\uB2C8\uB2E4.",
    signupSubmit: "\uAC00\uC785",
    close: "X",
    pendingTitle: "\uC2B9\uC778 \uB300\uAE30\uC911\uC785\uB2C8\uB2E4.",
    pendingDesc: "\uAD00\uB9AC\uC790 \uC2B9\uC778 \uD6C4 \uC774\uC6A9 \uAC00\uB2A5\uD569\uB2C8\uB2E4.",
    logout: "\uB85C\uADF8\uC544\uC6C3",
    invalidNick: "\uB2C9\uB124\uC784\uC740 \uD55C\uAE00 \uB610\uB294 \uC601\uBB38 2~10\uC790\uB9CC \uC785\uB825 \uAC00\uB2A5\uD569\uB2C8\uB2E4.",
    loginWrong: "\uC774\uBA54\uC77C \uB610\uB294 \uC554\uD638\uB97C \uB2E4\uC2DC \uD655\uC778\uD574\uC8FC\uC138\uC694",
    loginNeedInput: "\uC774\uBA54\uC77C\uACFC \uC554\uD638\uB97C \uBAA8\uB450 \uC785\uB825\uD574\uC8FC\uC138\uC694.",
    signupNeedInput: "\uBAA8\uB4E0 \uAC12\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.",
    signupDone: "\uD68C\uC6D0\uAC00\uC785 \uC644\uB8CC. \uC2B9\uC778 \uD6C4 \uC811\uC18D \uAC00\uB2A5\uD569\uB2C8\uB2E4.",
    noUserDoc: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uAD00\uB9AC\uC790\uC5D0\uAC8C \uBB38\uC758\uD574\uC8FC\uC138\uC694.",
    resetPrompt: "\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uC774\uBA54\uC77C\uC744 \uC785\uB825\uD558\uC138\uC694",
    resetDone: "\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uBA54\uC77C\uC744 \uC804\uC1A1\uD588\uC2B5\uB2C8\uB2E4."
  };

  const firebaseConfig = {
    apiKey: "AIzaSyCN1SqXwZWf7Z9r2oMrJGKF0pxfl4zBeTc",
    authDomain: "gui1d-point-db.firebaseapp.com",
    projectId: "gui1d-point-db"
  };

  let auth = null;
  let db = null;

  const style = document.createElement("style");
  style.id = "access-gate-style";
  style.textContent = `
    body > :not(#site-gate-overlay) { display: none !important; }
    #site-gate-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      background: radial-gradient(circle at 20% 20%, #2b3040, #161a23 60%, #111319);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-family: "Noto Sans KR", "Segoe UI", Arial, sans-serif;
      padding: 16px;
    }
    .site-gate-card {
      width: min(460px, calc(100vw - 32px));
      background: rgba(30, 35, 45, 0.95);
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 14px; padding: 20px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.45);
    }
    .site-gate-title { font-size: 22px; font-weight: 800; margin: 0 0 8px; text-align: center; }
    .site-gate-text { margin: 0 0 14px; text-align: center; color: #d0d7e3; font-size: 14px; }
    .site-gate-input {
      width: 100%; box-sizing: border-box; border: 1px solid #4a5160;
      background: #1b1f28; color: #fff; border-radius: 8px;
      padding: 10px 12px; font-size: 15px; outline: none; margin-top: 8px;
    }
    .site-gate-input:focus { border-color: #d4af37; }
    .site-gate-btn {
      width: 100%; margin-top: 10px; border: none; border-radius: 8px;
      padding: 10px 12px; font-size: 15px; font-weight: 700;
      background: #d4af37; color: #111; cursor: pointer; transition: filter .2s ease;
    }
    .site-gate-btn:hover { filter: brightness(1.08); }
    .site-gate-sub-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
    .site-gate-sub-btn {
      border: none; border-radius: 8px; padding: 9px 10px; font-size: 14px; font-weight: 700;
      background: #3b4252; color: #f1f3f8; cursor: pointer; transition: filter .2s ease;
    }
    .site-gate-sub-btn:hover { filter: brightness(1.08); }
    .site-gate-toggle { margin-top: 8px; display: flex; align-items: center; gap: 6px; font-size: 13px; color: #d0d7e3; }
    .site-gate-error { min-height: 20px; margin-top: 8px; color: #ff7e7e; font-size: 13px; text-align: center; white-space: pre-wrap; }
    .site-gate-info { min-height: 20px; margin-top: 6px; color: #8be28b; font-size: 13px; text-align: center; }
    #siteSignupModal {
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.62);
      align-items: center; justify-content: center; z-index: 2147483648; padding: 16px;
      animation: gateFadeIn .2s ease;
    }
    .site-signup-box {
      width: min(440px, calc(100vw - 32px));
      background: rgba(30, 35, 45, 0.98); border: 1px solid rgba(255,255,255,0.16);
      border-radius: 14px; padding: 18px; transform: scale(.96);
      animation: gateScaleIn .2s ease forwards;
    }
    .site-signup-title { margin: 0 0 8px; font-size: 20px; font-weight: 800; }
    .site-signup-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .site-signup-msg { margin-top: 8px; color: #cdd4e0; font-size: 13px; text-align: center; }
    .site-signup-actions { margin-top: 10px; display: flex; gap: 8px; }
    .site-signup-actions button { flex: 1; border: none; border-radius: 8px; padding: 10px; font-weight: 700; cursor: pointer; }
    .site-signup-submit { background: #d4af37; color: #111; }
    .site-signup-close { background: #3b4252; color: #fff; }
    #sitePendingBox { display: none; text-align: center; }
    .site-pending-title { font-size: 22px; font-weight: 800; margin: 0 0 8px; }
    .site-pending-text { margin: 0 0 14px; color: #d0d7e3; }
    @keyframes gateFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes gateScaleIn { from { opacity: .6; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `;

  function setAdminMenuVisible(visible) {
    try {
      localStorage.setItem(ADMIN_KEY, visible ? "1" : "0");
    } catch (_err) {}

    const titles = [...document.querySelectorAll(".menu-title")];
    const items = [...document.querySelectorAll(".menu-item")];

    titles.forEach((el) => {
      if (el.textContent.trim() === "\uAD00\uB9AC\uC790") {
        el.style.display = visible ? "" : "none";
      }
    });
    items.forEach((el) => {
      if (el.textContent.trim() === "\uD68C\uC6D0 \uAD00\uB9AC" || el.textContent.trim() === "\uAD00\uB9AC\uC790") {
        el.style.display = visible ? "" : "none";
      }
    });
  }

  function releaseGate() {
    document.getElementById("site-gate-overlay")?.remove();
    document.getElementById("access-gate-style")?.remove();
  }

  function renderGate() {
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "site-gate-overlay";
    overlay.innerHTML = `
      <div class="site-gate-card">
        <div id="siteLoginBox">
          <h1 class="site-gate-title">${TXT.title}</h1>
          <p class="site-gate-text">${TXT.desc}</p>

          <input id="siteGateEmail" class="site-gate-input" type="email" placeholder="${TXT.emailPh}">
          <input id="siteGatePassword" class="site-gate-input" type="password" placeholder="${TXT.pwPh}">

          <label class="site-gate-toggle">
            <input id="siteGateShow" type="checkbox">
            <span>${TXT.showPw}</span>
          </label>

          <button id="siteGateLoginBtn" class="site-gate-btn" type="button">${TXT.login}</button>

          <div class="site-gate-sub-actions">
            <button id="siteGateSignupBtn" class="site-gate-sub-btn" type="button">${TXT.signup}</button>
            <button id="siteGateResetBtn" class="site-gate-sub-btn" type="button">${TXT.reset}</button>
          </div>

          <div id="siteGateError" class="site-gate-error"></div>
          <div id="siteGateInfo" class="site-gate-info"></div>
        </div>

        <div id="sitePendingBox">
          <h2 class="site-pending-title">${TXT.pendingTitle}</h2>
          <p class="site-pending-text">${TXT.pendingDesc}</p>
          <button id="sitePendingLogoutBtn" class="site-gate-btn" type="button">${TXT.logout}</button>
        </div>
      </div>

      <div id="siteSignupModal">
        <div class="site-signup-box" onclick="event.stopPropagation()">
          <div class="site-signup-head">
            <h2 class="site-signup-title">${TXT.signupTitle}</h2>
            <button id="siteSignupCloseBtn" class="site-signup-close" type="button">${TXT.close}</button>
          </div>
          <input id="siteSignupNickname" class="site-gate-input" type="text" placeholder="${TXT.nickPh}">
          <input id="siteSignupEmail" class="site-gate-input" type="email" placeholder="${TXT.emailPh}">
          <input id="siteSignupPassword" class="site-gate-input" type="password" placeholder="${TXT.pwPh}">
          <div class="site-signup-actions">
            <button id="siteSignupSubmitBtn" class="site-signup-submit" type="button">${TXT.signupSubmit}</button>
          </div>
          <div class="site-signup-msg">${TXT.signupMsg}</div>
          <div id="siteSignupError" class="site-gate-error"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  async function initFirebase() {
    const appMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const authMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const fsMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

    const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
    auth = authMod.getAuth(app);
    db = fsMod.getFirestore(app);

    return { authMod, fsMod };
  }

  async function bindLogic() {
    renderGate();
    const { authMod, fsMod } = await initFirebase();
    window.__guildSignOut = async function __guildSignOut() {
      await authMod.signOut(auth);
    };

    const loginBox = document.getElementById("siteLoginBox");
    const pendingBox = document.getElementById("sitePendingBox");

    const emailEl = document.getElementById("siteGateEmail");
    const pwEl = document.getElementById("siteGatePassword");
    const showEl = document.getElementById("siteGateShow");
    const loginBtn = document.getElementById("siteGateLoginBtn");
    const signupBtn = document.getElementById("siteGateSignupBtn");
    const resetBtn = document.getElementById("siteGateResetBtn");
    const errorEl = document.getElementById("siteGateError");
    const infoEl = document.getElementById("siteGateInfo");

    const signupModal = document.getElementById("siteSignupModal");
    const signupNick = document.getElementById("siteSignupNickname");
    const signupEmail = document.getElementById("siteSignupEmail");
    const signupPw = document.getElementById("siteSignupPassword");
    const signupSubmitBtn = document.getElementById("siteSignupSubmitBtn");
    const signupCloseBtn = document.getElementById("siteSignupCloseBtn");
    const signupErrEl = document.getElementById("siteSignupError");

    const pendingLogoutBtn = document.getElementById("sitePendingLogoutBtn");

    function setError(msg) {
      if (errorEl) errorEl.textContent = msg || "";
      if (infoEl && msg) infoEl.textContent = "";
    }

    function setInfo(msg) {
      if (infoEl) infoEl.textContent = msg || "";
      if (errorEl && msg) errorEl.textContent = "";
    }

    function showPendingView() {
      if (loginBox) loginBox.style.display = "none";
      if (pendingBox) pendingBox.style.display = "block";
    }

    function showLoginView() {
      if (pendingBox) pendingBox.style.display = "none";
      if (loginBox) loginBox.style.display = "block";
    }

    function openSignup() {
      signupErrEl.textContent = "";
      signupModal.style.display = "flex";
      signupNick.focus();
    }

    function closeSignup() {
      signupModal.style.display = "none";
    }

    function mapLoginError(err) {
      const code = String(err?.code || "");
      if (
        code === "auth/invalid-email" ||
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found" ||
        code === "auth/missing-password"
      ) {
        return TXT.loginWrong;
      }
      return `${TXT.login}\u0020\uC2E4\uD328: ${err?.message || String(err)}`;
    }

    async function handleRoleGate(user) {
      const userRef = fsMod.doc(db, "users", user.uid);
      const userSnap = await fsMod.getDoc(userRef);

      if (!userSnap.exists()) {
        setError(TXT.noUserDoc);
        await authMod.signOut(auth);
        return;
      }

      const role = String(userSnap.data()?.role || "pending");
      setAdminMenuVisible(role === "admin");

      if (role === "pending") {
        showPendingView();
        setError(TXT.pendingTitle + "\n" + TXT.pendingDesc);
        return;
      }

      if (role === "approved" || role === "admin") {
        releaseGate();
      }
    }

    authMod.onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAdminMenuVisible(false);
        showLoginView();
        return;
      }

      try {
        await handleRoleGate(user);
      } catch (err) {
        setError(`${TXT.login}\u0020\uCC98\uB9AC\u0020\uC2E4\uD328: ${String(err)}`);
      }
    });

    async function doLogin() {
      const email = emailEl.value.trim();
      const password = pwEl.value;

      if (!email || !password) {
        setError(TXT.loginNeedInput);
        return;
      }

      try {
        await authMod.signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setError(mapLoginError(err));
      }
    }

    async function doSignup() {
      signupErrEl.textContent = "";
      const nickname = signupNick.value.trim();
      const email = signupEmail.value.trim();
      const password = signupPw.value;

      if (!nickname || !email || !password) {
        signupErrEl.textContent = TXT.signupNeedInput;
        return;
      }
      if (!NICK_REGEX.test(nickname)) {
        signupErrEl.textContent = TXT.invalidNick;
        return;
      }

      try {
        const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
        await fsMod.setDoc(fsMod.doc(db, "users", cred.user.uid), {
          email: cred.user.email,
          nickname,
          role: "pending",
          created_at: fsMod.serverTimestamp()
        });

        closeSignup();
        setInfo(TXT.signupDone);
      } catch (err) {
        signupErrEl.textContent = `${TXT.signup}\u0020\uC2E4\uD328: ${err?.message || String(err)}`;
      }
    }

    async function doReset() {
      const email = (emailEl.value.trim() || window.prompt(TXT.resetPrompt, "") || "").trim();
      if (!email) return;

      try {
        await authMod.sendPasswordResetEmail(auth, email);
        setInfo(TXT.resetDone);
      } catch (err) {
        setError(`${TXT.reset}\u0020\uC2E4\uD328: ${err?.message || String(err)}`);
      }
    }

    loginBtn?.addEventListener("click", doLogin);
    pwEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
    showEl?.addEventListener("change", () => {
      pwEl.type = showEl.checked ? "text" : "password";
    });

    signupBtn?.addEventListener("click", openSignup);
    resetBtn?.addEventListener("click", doReset);
    signupSubmitBtn?.addEventListener("click", doSignup);
    signupCloseBtn?.addEventListener("click", closeSignup);

    // 요구사항: 팝업은 X 버튼 혹은 ESC로만 닫힘 (바깥 클릭 닫힘 금지)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && signupModal.style.display === "flex") {
        closeSignup();
      }
    });

    pendingLogoutBtn?.addEventListener("click", async () => {
      await authMod.signOut(auth);
      showLoginView();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindLogic().catch((err) => console.error(err));
    }, { once: true });
  } else {
    bindLogic().catch((err) => console.error(err));
  }
})();
