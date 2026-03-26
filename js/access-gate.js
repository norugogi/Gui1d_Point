(function () {
  const ACCESS_KEY = "guild_access_granted_v1";
  const PASSWORD = "catdog2026!@";

  try {
    if (sessionStorage.getItem(ACCESS_KEY) === "true") {
      return;
    }
  } catch (_err) {
    // Continue with gate rendering.
  }

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
    }
    .site-gate-card {
      width: min(420px, calc(100vw - 32px));
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
    }
    .site-gate-error {
      min-height: 20px;
      margin-top: 8px;
      color: #ff7e7e;
      font-size: 13px;
      text-align: center;
    }
  `;

  const renderGate = () => {
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "site-gate-overlay";
    overlay.innerHTML = `
      <div class="site-gate-card">
        <h1 class="site-gate-title">내부 전용 페이지</h1>
        <p class="site-gate-text">접속 비밀번호를 입력해주세요.</p>
        <input id="siteGateInput" class="site-gate-input" type="password" placeholder="비밀번호">
        <button id="siteGateBtn" class="site-gate-btn" type="button">입장</button>
        <div id="siteGateError" class="site-gate-error"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById("siteGateInput");
    const button = document.getElementById("siteGateBtn");
    const error = document.getElementById("siteGateError");

    const submit = () => {
      if (!input || !error) return;

      if (input.value === PASSWORD) {
        try {
          sessionStorage.setItem(ACCESS_KEY, "true");
        } catch (_err) {
          // ignore
        }
        location.reload();
        return;
      }

      error.textContent = "비밀번호가 올바르지 않습니다.";
      input.value = "";
      input.focus();
    };

    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    button?.addEventListener("click", submit);
    input?.focus();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderGate, { once: true });
  } else {
    renderGate();
  }
})();
