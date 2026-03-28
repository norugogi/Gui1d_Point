import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCN1SqXwZWf7Z9r2oMrJGKF0pxfl4zBeTc",
  authDomain: "gui1d-point-db.firebaseapp.com",
  projectId: "gui1d-point-db"
};

const ADMIN_KEY = "gui1d_admin_logged_in";
const ROLE_KEY = "gui1d_user_role";
const ROLL_INTERVAL = 30000;

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

let notices = [];
let currentIndex = 0;
let intervalId = null;

const elText = document.getElementById("rollingNoticeText");
const elAddBtn = document.getElementById("rollingAddBtn");
const elEditBtn = document.getElementById("rollingEditBtn");
const elModal = document.getElementById("rollingNoticeModal");
const elModalClose = document.getElementById("rollingModalClose");
const elModalTitle = document.getElementById("rollingModalTitle");
const elAddSection = document.getElementById("rollingAddSection");
const elEditSection = document.getElementById("rollingEditSection");
const elInput = document.getElementById("rollingNoticeInput");
const elSaveBtn = document.getElementById("rollingSaveBtn");
const elEditList = document.getElementById("rollingEditList");

function isAdmin() {
  return localStorage.getItem(ADMIN_KEY) === "1";
}

function canManage() {
  const role = String(localStorage.getItem(ROLE_KEY) || "");
  if (role) return role === "admin" || role === "manager";
  return isAdmin();
}

function applyAdminUI() {
  const show = canManage();
  if (elAddBtn) elAddBtn.style.display = show ? "inline-block" : "none";
  if (elEditBtn) elEditBtn.style.display = show ? "inline-block" : "none";
}

function fadeSetText(nextText) {
  if (!elText) return;
  elText.classList.add("fade-out");
  window.setTimeout(() => {
    elText.textContent = nextText;
    elText.classList.remove("fade-out");
  }, 220);
}

function renderCurrentNotice() {
  if (!elText) return;
  if (!notices.length) {
    fadeSetText("등록된 공지가 없습니다");
    return;
  }
  const text = notices[currentIndex]?.content || "등록된 공지가 없습니다";
  fadeSetText(text);
}

function startRollingLoop() {
  if (intervalId) clearInterval(intervalId);
  intervalId = window.setInterval(() => {
    if (!notices.length) return;
    currentIndex = (currentIndex + 1) % notices.length;
    renderCurrentNotice();
  }, ROLL_INTERVAL);
}

async function fetchNotices() {
  if (elText) elText.textContent = "불러오는 중...";

  const q = query(collection(db, "rolling_notices"), orderBy("timestamp", "asc"));
  const snap = await getDocs(q);
  notices = snap.docs.map((d) => ({
    id: d.id,
    content: String(d.data()?.content || ""),
    timestamp: Number(d.data()?.timestamp || 0)
  }));

  currentIndex = 0;
  renderCurrentNotice();
  startRollingLoop();
}

function openModal(mode) {
  if (!elModal) return;
  if (mode === "add") {
    elModalTitle.textContent = "롤링 공지 추가";
    elAddSection.style.display = "block";
    elEditSection.style.display = "none";
    elInput.value = "";
  } else {
    elModalTitle.textContent = "롤링 공지 수정";
    elAddSection.style.display = "none";
    elEditSection.style.display = "block";
    renderEditList();
  }
  elModal.style.display = "flex";
}

function closeModal() {
  if (elModal) elModal.style.display = "none";
}

async function saveNotice() {
  const content = (elInput?.value || "").trim();
  if (!content) {
    window.alert("공지 내용을 입력해주세요.");
    return;
  }

  await addDoc(collection(db, "rolling_notices"), {
    content,
    timestamp: Date.now()
  });

  closeModal();
  await fetchNotices();
}

async function removeNotice(id) {
  if (!id) return;
  await deleteDoc(doc(db, "rolling_notices", id));
  await fetchNotices();
  renderEditList();
}

function renderEditList() {
  if (!elEditList) return;

  if (!notices.length) {
    elEditList.innerHTML = '<div style="color:#c3c7d2;">등록된 공지가 없습니다</div>';
    return;
  }

  elEditList.innerHTML = notices.map((n) => `
    <div class="rolling-edit-item">
      <div class="rolling-edit-content">${escapeHtml(n.content)}</div>
      <button type="button" class="rolling-del-btn" data-id="${n.id}">삭제</button>
    </div>
  `).join("");

  elEditList.querySelectorAll(".rolling-del-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;
      if (!window.confirm("해당 공지를 삭제할까요?")) return;
      try {
        await removeNotice(id);
      } catch (err) {
        window.alert("삭제 실패: " + String(err));
      }
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function bindEvents() {
  elAddBtn?.addEventListener("click", () => openModal("add"));
  elEditBtn?.addEventListener("click", () => openModal("edit"));
  elSaveBtn?.addEventListener("click", async () => {
    try {
      await saveNotice();
    } catch (err) {
      window.alert("저장 실패: " + String(err));
    }
  });

  elModalClose?.addEventListener("click", closeModal);
  elModal?.addEventListener("click", (e) => {
    if (e.target === elModal) closeModal();
  });

  // 관리자 상태가 다른 페이지(관리자 메뉴)에서 바뀌어도 버튼 상태 동기화
  window.addEventListener("storage", applyAdminUI);
  window.addEventListener("focus", applyAdminUI);
  document.addEventListener("visibilitychange", applyAdminUI);
}

document.addEventListener("DOMContentLoaded", async () => {
  applyAdminUI();
  bindEvents();
  try {
    await fetchNotices();
  } catch (err) {
    if (elText) elText.textContent = "불러오는 중...";
    window.setTimeout(() => {
      if (elText) elText.textContent = "등록된 공지가 없습니다";
    }, 500);
    console.error(err);
  }
});
