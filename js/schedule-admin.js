(function scheduleAdminModule() {
  const ADMIN_KEY = "gui1d_admin_logged_in";
  const ROLE_KEY = "gui1d_user_role";
  const firebaseConfig = {
    apiKey: "AIzaSyCN1SqXwZWf7Z9r2oMrJGKF0pxfl4zBeTc",
    authDomain: "gui1d-point-db.firebaseapp.com",
    projectId: "gui1d-point-db"
  };

  let db = null;
  let firestoreRows = [];
  let renderedByFirestore = false;

  function initFirebase() {
    if (!window.firebase) return;
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
  }

  function isAdmin() {
    return localStorage.getItem(ADMIN_KEY) === "1";
  }

  function canManage() {
    const role = String(localStorage.getItem(ROLE_KEY) || "");
    if (role) return role === "admin" || role === "manager";
    return isAdmin();
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setAdminButtonVisibility() {
    const addBtn = getEl("scheduleAddBtn");
    if (addBtn) {
      addBtn.style.display = canManage() ? "inline-block" : "none";
    }

    // Firestore 데이터로 렌더된 상태라면 관리자 상태 변경 시 행 삭제 버튼도 즉시 반영
    if (renderedByFirestore) {
      renderScheduleRows(firestoreRows, true);
    }
  }

  function renderScheduleRows(rows, fromFirestore) {
    const body = getEl("scheduleBody");
    if (!body) return;

    const safeRows = Array.isArray(rows) ? [...rows] : [];
    while (safeRows.length < 5) {
      safeRows.push({ day: "", content: "", id: "" });
    }

    const admin = canManage() && fromFirestore;

    body.innerHTML = safeRows.slice(0, 5).map((row) => {
      const day = escapeHtml(row.day || "-");
      const content = escapeHtml(row.content || "-");

      const contentCell = admin && row.id
        ? `<div class="schedule-content-row"><span>${content}</span><button type="button" class="schedule-inline-del" data-id="${row.id}">삭제</button></div>`
        : content;

      return `
        <tr>
          <td>${day}</td>
          <td>${contentCell}</td>
        </tr>
      `;
    }).join("");

    if (admin) {
      body.querySelectorAll(".schedule-inline-del").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!id) return;
          if (!window.confirm("선택한 일정을 삭제할까요?")) return;

          try {
            await deleteScheduleRow(id);
          } catch (err) {
            window.alert("삭제 실패: " + String(err));
          }
        });
      });
    }
  }

  async function loadScheduleFromFirestore() {
    if (!db) return;

    try {
      // timestamp 오름차순(asc): 이른 일정이 위에 오도록 정렬
      const snap = await db.collection("schedule").orderBy("timestamp", "asc").get();
      const rows = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          day: String(data.day || ""),
          content: String(data.content || ""),
          timestamp: Number(data.timestamp || 0)
        };
      });

      if (!rows.length) {
        firestoreRows = [];
        renderedByFirestore = false;
        return;
      }

      firestoreRows = rows;
      renderedByFirestore = true;
      renderScheduleRows(rows, true);
    } catch (_err) {
      // Firestore 실패 시 기존 schedule.json 렌더(main.js)를 유지
    }
  }

  async function deleteScheduleRow(id) {
    if (!db) return;
    await db.collection("schedule").doc(id).delete();
    await loadScheduleFromFirestore();
  }

  function createFormRow(dayValue, contentValue) {
    const row = document.createElement("div");
    row.className = "schedule-form-item";
    row.innerHTML = `
      <input type="text" class="schedule-day-input" placeholder="날짜/시간 (예: 3/29(일) 21:00)" value="${escapeHtml(dayValue || "")}">
      <input type="text" class="schedule-content-input" placeholder="콘텐츠 (예: 별빛 해방전)" value="${escapeHtml(contentValue || "")}">
      <button type="button" class="schedule-row-del-btn">삭제</button>
    `;

    row.querySelector(".schedule-row-del-btn")?.addEventListener("click", () => {
      const list = getEl("scheduleFormList");
      row.remove();
      if (list && !list.children.length) {
        list.appendChild(createFormRow("", ""));
      }
    });

    return row;
  }

  function openModal() {
    const modal = getEl("scheduleAdminModal");
    const list = getEl("scheduleFormList");
    if (!modal || !list) return;

    list.innerHTML = "";
    list.appendChild(createFormRow("", ""));
    modal.style.display = "flex";
  }

  function closeModal() {
    const modal = getEl("scheduleAdminModal");
    if (modal) modal.style.display = "none";
  }

  function collectRows() {
    const list = getEl("scheduleFormList");
    if (!list) return [];

    return [...list.querySelectorAll(".schedule-form-item")].map((item) => ({
      day: item.querySelector(".schedule-day-input")?.value.trim() || "",
      content: item.querySelector(".schedule-content-input")?.value.trim() || ""
    }));
  }

  async function saveScheduleRows() {
    if (!db) return;

    const rows = collectRows();
    if (!rows.length) {
      window.alert("입력된 일정이 없습니다.");
      return;
    }

    const hasEmpty = rows.some((r) => !r.day || !r.content);
    if (hasEmpty) {
      window.alert("날짜/시간과 콘텐츠를 모두 입력해주세요.");
      return;
    }

    const baseTs = Date.now();
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      await db.collection("schedule").add({
        day: row.day,
        content: row.content,
        timestamp: baseTs + i
      });
    }

    closeModal();
    await loadScheduleFromFirestore();
    window.alert("저장 완료");
  }

  function bindEvents() {
    const addBtn = getEl("scheduleAddBtn");
    const modal = getEl("scheduleAdminModal");
    const closeBtn = getEl("scheduleModalClose");
    const addRowBtn = getEl("scheduleAddRowBtn");
    const saveBtn = getEl("scheduleSaveBtn");
    const list = getEl("scheduleFormList");

    addBtn?.addEventListener("click", openModal);
    closeBtn?.addEventListener("click", closeModal);

    modal?.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    addRowBtn?.addEventListener("click", () => {
      if (!list) return;
      list.appendChild(createFormRow("", ""));
    });

    saveBtn?.addEventListener("click", async () => {
      try {
        await saveScheduleRows();
      } catch (err) {
        window.alert("저장 실패: " + String(err));
      }
    });

    // 관리자 상태 변경 동기화 (관리자 페이지에서 로그인/로그아웃 시 반영)
    window.addEventListener("storage", setAdminButtonVisibility);
    window.addEventListener("focus", setAdminButtonVisibility);
    document.addEventListener("visibilitychange", setAdminButtonVisibility);
    setInterval(setAdminButtonVisibility, 1000);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initFirebase();
    bindEvents();
    setAdminButtonVisibility();
    await loadScheduleFromFirestore();
  });
})();
