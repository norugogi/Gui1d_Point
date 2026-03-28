import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCN1SqXwZWf7Z9r2oMrJGKF0pxfl4zBeTc",
  authDomain: "gui1d-point-db.firebaseapp.com",
  projectId: "gui1d-point-db"
};

const ADMIN_KEY = "gui1d_admin_logged_in";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const noticesRef = collection(db, "notices");

const elFeed = document.getElementById("noticeFeed");
const elCreateBtn = document.getElementById("noticeCreateBtn");

const elModal = document.getElementById("noticeEditorModal");
const elModalTitle = document.getElementById("noticeEditorTitle");
const elModalCloseBtn = document.getElementById("noticeEditorCloseBtn");
const elSaveBtn = document.getElementById("noticeSaveBtn");

const elTitleInput = document.getElementById("noticeTitleInput");
const elContentInput = document.getElementById("noticeContentInput");
const elPinnedInput = document.getElementById("noticePinnedInput");

let editDocId = null;

function isAdmin() {
  return localStorage.getItem(ADMIN_KEY) === "1";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function applyAdminUI() {
  if (!elCreateBtn) return;
  elCreateBtn.style.display = isAdmin() ? "inline-block" : "none";

  document.querySelectorAll(".notice-admin-actions").forEach((el) => {
    el.style.display = isAdmin() ? "flex" : "none";
  });
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatRelative(dateObj) {
  if (!dateObj) return "시간 정보 없음";

  const diffSec = Math.max(0, Math.floor((Date.now() - dateObj.getTime()) / 1000));
  if (diffSec < 60) return "방금 전";

  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}분 전`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;

  const day = Math.floor(hour / 24);
  return `${day}일 전`;
}

function isNewWithin24h(dateObj) {
  if (!dateObj) return false;
  return Date.now() - dateObj.getTime() <= 24 * 60 * 60 * 1000;
}

function openEditor(mode, payload) {
  editDocId = null;
  elTitleInput.value = "";
  elContentInput.value = "";
  elPinnedInput.checked = false;

  if (mode === "edit" && payload) {
    elModalTitle.textContent = "공지 수정";
    editDocId = payload.id;
    elTitleInput.value = payload.title || "";
    elContentInput.value = payload.content || "";
    elPinnedInput.checked = Boolean(payload.pinned);
  } else {
    elModalTitle.textContent = "공지 등록";
  }

  elModal.style.display = "flex";
}

function closeEditor() {
  elModal.style.display = "none";
}

async function saveEditor() {
  const title = elTitleInput.value.trim();
  const content = elContentInput.value.trim();
  const pinned = Boolean(elPinnedInput.checked);

  if (!title || !content) {
    window.alert("제목과 내용을 모두 입력해주세요.");
    return;
  }

  if (editDocId) {
    await updateDoc(doc(db, "notices", editDocId), {
      title,
      content,
      pinned,
      updated_at: serverTimestamp()
    });
  } else {
    await addDoc(noticesRef, {
      title,
      content,
      pinned,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  closeEditor();
}

async function removeNotice(id) {
  if (!id) return;
  if (!window.confirm("이 공지를 삭제할까요?")) return;
  await deleteDoc(doc(db, "notices", id));
}

function renderFeed(rows) {
  if (!rows.length) {
    elFeed.innerHTML = '<div class="notice-loading">등록된 공지가 없습니다</div>';
    return;
  }

  elFeed.innerHTML = rows.map((row) => {
    const createdDate = toDate(row.created_at);
    const relative = formatRelative(createdDate);
    const isNew = isNewWithin24h(createdDate);

    return `
      <article class="notice-card ${row.pinned ? "pinned" : ""}">
        ${row.pinned ? '<div class="notice-pin">📌 고정</div>' : ""}
        <h3 class="notice-title">${escapeHtml(row.title || "-")}</h3>
        <div class="notice-content">${escapeHtml(row.content || "-")}</div>
        <div class="notice-meta">
          <span>${escapeHtml(relative)}</span>
          ${isNew ? '<span class="notice-new">NEW</span>' : ""}
        </div>
        <div class="notice-admin-actions" style="display:${isAdmin() ? "flex" : "none"};">
          <button type="button" class="notice-btn soft" data-edit="${row.id}">수정</button>
          <button type="button" class="notice-btn danger" data-del="${row.id}">삭제</button>
        </div>
      </article>
    `;
  }).join("");

  const map = new Map(rows.map((r) => [r.id, r]));

  elFeed.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const row = map.get(id);
      if (!row) return;
      openEditor("edit", row);
    });
  });

  elFeed.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      try {
        await removeNotice(id);
      } catch (err) {
        window.alert("삭제 실패: " + String(err));
      }
    });
  });
}

function subscribeNotices() {
  elFeed.innerHTML = '<div class="notice-loading">불러오는 중...</div>';

  const q = query(noticesRef, orderBy("pinned", "desc"), orderBy("created_at", "desc"));
  onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({
      id: d.id,
      title: d.data()?.title || "",
      content: d.data()?.content || "",
      pinned: Boolean(d.data()?.pinned),
      created_at: d.data()?.created_at || null,
      updated_at: d.data()?.updated_at || null
    }));

    renderFeed(rows);
    applyAdminUI();
  }, (err) => {
    console.error(err);
    elFeed.innerHTML = '<div class="notice-loading">불러오는 중...</div>';
    window.setTimeout(() => {
      elFeed.innerHTML = '<div class="notice-loading">등록된 공지가 없습니다</div>';
    }, 700);
  });
}

function bindEvents() {
  elCreateBtn?.addEventListener("click", () => openEditor("create"));
  elModalCloseBtn?.addEventListener("click", closeEditor);
  elSaveBtn?.addEventListener("click", async () => {
    try {
      await saveEditor();
    } catch (err) {
      window.alert("저장 실패: " + String(err));
    }
  });

  elModal?.addEventListener("click", (e) => {
    if (e.target === elModal) closeEditor();
  });

  // 관리자 상태 동기화 (관리자 메뉴 로그인/로그아웃 반영)
  window.addEventListener("storage", applyAdminUI);
  window.addEventListener("focus", applyAdminUI);
  document.addEventListener("visibilitychange", applyAdminUI);
  setInterval(applyAdminUI, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  applyAdminUI();
  bindEvents();
  subscribeNotices();
});
