(function scheduleAdminModule() {
  const ADMIN_KEY = "gui1d_admin_logged_in";
  const firebaseConfig = {
    apiKey: "AIzaSyCN1SqXwZWf7Z9r2oMrJGKF0pxfl4zBeTc",
    authDomain: "gui1d-point-db.firebaseapp.com",
    projectId: "gui1d-point-db"
  };

  let db = null;

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

  function getEl(id) {
    return document.getElementById(id);
  }

  function setAddButtonVisibility() {
    const btn = getEl("scheduleAddBtn");
    if (!btn) return;
    btn.style.display = isAdmin() ? "inline-block" : "none";
  }

  function renderScheduleRows(rows) {
    const body = getEl("scheduleBody");
    if (!body) return;

    const safeRows = Array.isArray(rows) ? [...rows] : [];
    while (safeRows.length < 5) {
      safeRows.push({ day: "", content: "" });
    }

    body.innerHTML = safeRows.slice(0, 5).map((row) => `
      <tr>
        <td>${row.day || "-"}</td>
        <td>${row.content || "-"}</td>
      </tr>
    `).join("");
  }

  async function loadScheduleFromFirestore() {
    if (!db) return;
    try {
      const snap = await db.collection("schedule").get();
      const rows = snap.docs
        .map((d) => d.data() || {})
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
        .map((r) => ({ day: String(r.day || ""), content: String(r.content || "") }));

      if (!rows.length) return;
      renderScheduleRows(rows);
    } catch (_err) {
      // Keep existing schedule.json rendering when Firestore fetch fails.
    }
  }

  function createFormRow(dayValue, contentValue) {
    const row = document.createElement("div");
    row.className = "schedule-form-item";
    row.innerHTML = `
      <input type="text" class="schedule-day-input" placeholder="날짜/시간 (예: 3/29(일) 21:00)" value="${dayValue || ""}">
      <input type="text" class="schedule-content-input" placeholder="콘텐츠 (예: 별빛 해방전)" value="${contentValue || ""}">
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

    window.addEventListener("storage", () => {
      setAddButtonVisibility();
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initFirebase();
    bindEvents();
    setAddButtonVisibility();
    await loadScheduleFromFirestore();
  });
})();
