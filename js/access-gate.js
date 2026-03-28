(function () {
  const ACCESS_KEY = "guild_access_granted_v2";
  const ADMIN_KEY = "gui1d_admin_logged_in";
  const NICK_REGEX = /^[a-zA-Z가-힣]{2,10}$/;

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
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: radial-gradient(circle at 20% 20%, #2b3040, #161a23 60%, #111319);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-family: "Noto Sans KR", "Segoe UI", Arial, sans-serif;
      padding: 16px;
    }
    .site-gate-card {
      width: min(460px, calc(100vw - 32px));
      background: rgba(30, 35, 45, 0.95);
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.45);
    }
    .site-gate-title {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 8px;
      text-align: center;
    }
    .site-gate-text {
      margin: 0 0 14px;
      text-align: center;
      color: #d0d7e3;
      font-size: 14px;
    }
    .site-gate-input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #4a5160;
      background: #1b1f28;
      color: #fff;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 15px;
      outline: none;
      margin-top: 8px;
    }
    .site-gate-input:focus {
      border-color: #d4af37;
    }
    .site-gate-btn {
      width: 100%;
      margin-top: 10px;
      border: none;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 15px;
      font-weight: 700;
      background: #d4af37;
      color: #111;
      cursor: pointer;
      transition: filter .2s ease;
    }
    .site-gate-btn:hover { filter: brightness(1.08); }
    .site-gate-sub-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
    }
    .site-gate-sub-btn {
      border: none;
      border-radius: 8px;
      padding: 9px 10px;
      font-size: 14px;
      font-weight: 700;
      background: #3b4252;
      color: #f1f3f8;
      cursor: pointer;
      transition: filter .2s ease;
    }
    .site-gate-sub-btn:hover { filter: brightness(1.08); }
    .site-gate-toggle {
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #d0d7e3;
      user-select: none;
    }
    .site-gate-error {
      min-height: 20px;
      margin-top: 8px;
      color: #ff7e7e;
      font-size: 13px;
      text-align: center;
      white-space: pre-wrap;
    }
    .site-gate-info {
      min-height: 20px;
      margin-top: 6px;
      color: #8be28b;
      font-size: 13px;
      text-align: center;
    }
    #siteSignupModal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.62);
      align-items: center;
      justify-content: center;
      z-index: 2147483648;
      padding: 16px;
      animation: gateFadeIn .2s ease;
    }
    .site-signup-box {
      width: min(440px, calc(100vw - 32px));
      background: rgba(30, 35, 45, 0.98);
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 14px;
      padding: 18px;
      transform: scale(.96);
      animation: gateScaleIn .2s ease forwards;
    }
    .site-signup-title {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 800;
    }
    .site-signup-msg {
      margin-top: 8px;
      color: #cdd4e0;
      font-size: 13px;
      text-align: center;
    }
    .site-signup-actions {
      margin-top: 10px;
      display: flex;
      gap: 8px;
    }
    .site-signup-actions button {
      flex: 1;
      border: none;
      border-radius: 8px;
      padding: 10px;
      font-weight: 700;
      cursor: pointer;
    }
    .site-signup-submit {
      background: #d4af37;
      color: #111;
    }
    .site-signup-close {
      background: #3b4252;
      color: #fff;
    }
    @keyframes gateFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes gateScaleIn { from { opacity: .6; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
  `;

  function setAdminUI(role) {
    const isAdmin = role === "admin";
    try {
      localStorage.setItem(ADMIN_KEY, isAdmin ? "1" : "0");
    } catch (_err) {
      // ignore
    }

    // Sidebar 관리자 메뉴 활성/비활성
    const titles = [...document.querySelectorAll(".menu-title")];
    const items = [...document.querySelectorAll(".menu-item")];

    titles.forEach((el) => {
      if (el.textContent.trim() === "관리자") {
        el.style.display = isAdmin ? "" : "none";
      }
    });
    items.forEach((el) => {
      if (el.textContent.trim() === "관리자") {
        el.style.display = isAdmin ? "" : "none";
      }
    });
  }

  function releaseGate() {
    const overlay = document.getElementById("site-gate-overlay");
    if (overlay) overlay.remove();
    const styleEl = document.getElementById("access-gate-style");
    if (styleEl) styleEl.remove();
    try {
      sessionStorage.setItem(ACCESS_KEY, "true");
    } catch (_err) {
      // ignore
    }
  }

  function renderGate() {
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "site-gate-overlay";
    overlay.innerHTML = `
      <div class="site-gate-card">
        <h1 class="site-gate-title">내부 전용 페이지</h1>
        <p class="site-gate-text">접속을 위해 로그인해주세요.</p>

        <input id="siteGateEmail" class="site-gate-input" type="email" placeholder="이메일">
        <input id="siteGatePassword" class="site-gate-input" type="password" placeholder="비밀번호">

        <label class="site-gate-toggle">
          <input id="siteGateShow" type="checkbox">
          <span>비밀번호 보기</span>
        </label>

        <button id="siteGateLoginBtn" class="site-gate-btn" type="button">로그인</button>

        <div class="site-gate-sub-actions">
          <button id="siteGateSignupBtn" class="site-gate-sub-btn" type="button">회원가입</button>
          <button id="siteGateResetBtn" class="site-gate-sub-btn" type="button">비밀번호 찾기</button>
        </div>

        <div id="siteGateError" class="site-gate-error"></div>
        <div id="siteGateInfo" class="site-gate-info"></div>
      </div>

      <div id="siteSignupModal">
        <div class="site-signup-box" onclick="event.stopPropagation()">
          <h2 class="site-signup-title">회원가입</h2>
          <input id="siteSignupNickname" class="site-gate-input" type="text" placeholder="인게임 닉네임">
          <input id="siteSignupEmail" class="site-gate-input" type="email" placeholder="이메일">
          <input id="siteSignupPassword" class="site-gate-input" type="password" placeholder="비밀번호">
          <div class="site-signup-actions">
            <button id="siteSignupSubmitBtn" class="site-signup-submit" type="button">가입</button>
            <button id="siteSignupCloseBtn" class="site-signup-close" type="button">닫기</button>
          </div>
          <div class="site-signup-msg">가입 후 빠르게 승인해드리겠습니다.</div>
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

    function setError(msg) {
      if (errorEl) errorEl.textContent = msg || "";
      if (infoEl && msg) infoEl.textContent = "";
    }
    function setInfo(msg) {
      if (infoEl) infoEl.textContent = msg || "";
      if (errorEl && msg) errorEl.textContent = "";
    }

    function openSignup() {
      signupErrEl.textContent = "";
      signupModal.style.display = "flex";
      signupNick.focus();
    }

    function closeSignup() {
      signupModal.style.display = "none";
    }

    async function handleRoleGate(user) {
      const userRef = fsMod.doc(db, "users", user.uid);
      const userSnap = await fsMod.getDoc(userRef);

      if (!userSnap.exists()) {
        setError("사용자 정보가 없습니다. 관리자에게 문의해주세요.");
        await authMod.signOut(auth);
        return;
      }

      const role = String(userSnap.data()?.role || "pending");
      setAdminUI(role);

      if (role === "pending") {
        setError("승인 대기중입니다. 관리자 승인 후 이용 가능합니다.");
        return;
      }

      if (role === "approved" || role === "admin") {
        releaseGate();
      }
    }

    authMod.onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAdminUI("guest");
        return;
      }
      try {
        await handleRoleGate(user);
      } catch (err) {
        setError("로그인 처리 실패: " + String(err));
      }
    });

    async function doLogin() {
      const email = emailEl.value.trim();
      const password = pwEl.value;

      if (!email || !password) {
        setError("이메일과 비밀번호를 입력해주세요.");
        return;
      }

      try {
        await authMod.signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setError("로그인 실패: " + (err?.message || String(err)));
      }
    }

    async function doSignup() {
      signupErrEl.textContent = "";

      const nickname = signupNick.value.trim();
      const email = signupEmail.value.trim();
      const password = signupPw.value;

      if (!nickname || !email || !password) {
        signupErrEl.textContent = "모든 값을 입력해주세요.";
        return;
      }
      if (!NICK_REGEX.test(nickname)) {
        signupErrEl.textContent = "닉네임은 한글 또는 영문 2~10자만 입력 가능합니다.";
        return;
      }

      try {
        const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
        const user = cred.user;

        await fsMod.setDoc(fsMod.doc(db, "users", user.uid), {
          email: user.email,
          nickname,
          role: "pending",
          created_at: fsMod.serverTimestamp()
        });

        closeSignup();
        setInfo("회원가입 완료. 승인 후 접속 가능합니다.");
      } catch (err) {
        signupErrEl.textContent = "가입 실패: " + (err?.message || String(err));
      }
    }

    async function doReset() {
      const email = (emailEl.value.trim() || window.prompt("비밀번호 재설정 이메일을 입력하세요", "") || "").trim();
      if (!email) return;

      try {
        await authMod.sendPasswordResetEmail(auth, email);
        setInfo("비밀번호 재설정 메일을 전송했습니다.");
      } catch (err) {
        setError("비밀번호 찾기 실패: " + (err?.message || String(err)));
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
    signupModal?.addEventListener("click", (e) => {
      if (e.target === signupModal) closeSignup();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindLogic().catch((err) => {
        console.error(err);
      });
    }, { once: true });
  } else {
    bindLogic().catch((err) => {
      console.error(err);
    });
  }
})();
