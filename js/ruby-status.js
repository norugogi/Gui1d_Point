import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCN1SqXwZWf7Z9r2oMrJGKF0pxfl4zBeTc",
  authDomain: "gui1d-point-db.firebaseapp.com",
  projectId: "gui1d-point-db"
};

const ADMIN_KEY = "gui1d_admin_logged_in";
const KOR_POOR = "\uBD80\uC871";
const KOR_NORMAL = "\uBCF4\uD1B5";
const KOR_ENOUGH = "\uCDA9\uBD84";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const rubyDocRef = doc(db, "status", "ruby");

const elTrack = document.getElementById("rubyGaugeTrack");
const elProgress = document.getElementById("rubyGaugeProgress");
const elCurrent = document.getElementById("rubyCurrentText");
const elState = document.getElementById("rubyStateText");
const elEditBtn = document.getElementById("rubyEditBtn");

let currentPercent = 0;
let currentValueAnimated = 0;
let latestData = {
  current: 0,
  max: 1,
  state: "-"
};

function isAdmin() {
  return localStorage.getItem(ADMIN_KEY) === "1";
}

function applyAdminUI() {
  if (!elEditBtn) return;
  elEditBtn.style.display = isAdmin() ? "inline-block" : "none";
}

function getStateColor(state) {
  if (state === KOR_POOR) return "#ff4d4d";
  if (state === KOR_NORMAL) return "#ffd54f";
  if (state === KOR_ENOUGH) return "#4caf50";
  return "#ffffff";
}

function formatRuby(value) {
  const num = Math.max(0, Number(value) || 0);
  if (num >= 10000) {
    const man = Math.round((num / 10000) * 10) / 10;
    const manText = man % 1 === 0 ? Math.trunc(man) : man;
    return `${manText}\uB9CC\uAC1C`;
  }
  if (num >= 1000000) {
    const m = Math.round((num / 1000000) * 10) / 10;
    return `${m}M`;
  }
  return `${num.toLocaleString("ko-KR")}\uAC1C`;
}

function buildRoundedPath() {
  // Start from left-bottom, then go up-left -> top-right -> mid-right -> bottom-right -> left-bottom.
  const x = 20;
  const y = 20;
  const w = 300;
  const h = 180;
  const r = 24;

  return [
    `M ${x} ${y + h - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `L ${x + w} ${y + h - r}`,
    `Q ${x + w} ${y + h} ${x + w - r} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `Q ${x} ${y + h} ${x} ${y + h - r}`
  ].join(" ");
}

function initPath() {
  if (!elTrack || !elProgress) return;
  const d = buildRoundedPath();
  elTrack.setAttribute("d", d);
  elProgress.setAttribute("d", d);
  elTrack.setAttribute("pathLength", "100");
  elProgress.setAttribute("pathLength", "100");
  elProgress.setAttribute("stroke-dasharray", "0 100");
}

function setGaugePercent(percent) {
  const p = Math.max(0, Math.min(1, percent || 0));
  const dash = p * 100;
  if (!elProgress) return;
  elProgress.setAttribute("stroke-dasharray", `${dash} 100`);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animatePercent(from, to, duration = 900) {
  const start = performance.now();
  const a = Math.max(0, Math.min(1, from || 0));
  const b = Math.max(0, Math.min(1, to || 0));

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    const value = a + (b - a) * eased;
    setGaugePercent(value);
    if (t < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function animateCount(from, to, duration = 900) {
  const start = performance.now();
  const a = Math.max(0, Number(from) || 0);
  const b = Math.max(0, Number(to) || 0);

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    const value = Math.round(a + (b - a) * eased);
    if (elCurrent) elCurrent.textContent = `\uBCF4\uC720 \uB8E8\uBE44 : ${formatRuby(value)}`;
    if (t < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function renderRuby(data) {
  const current = Number(data.current || 0);
  const max = Math.max(1, Number(data.max || 1));
  const state = String(data.state || "-");
  const percent = current / max;

  animatePercent(currentPercent, percent);
  animateCount(currentValueAnimated, current);

  currentPercent = percent;
  currentValueAnimated = current;

  if (elState) {
    elState.textContent = state;
    elState.style.color = getStateColor(state);
  }
}

async function editCurrentValue() {
  const prev = Number(latestData.current || 0);
  const input = window.prompt("\uD604\uC7AC \uB8E8\uBE44(current) \uAC12\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694", String(prev));
  if (input === null) return;

  const next = Number(String(input).replace(/,/g, "").trim());
  if (!Number.isFinite(next) || next < 0) {
    window.alert("\uC22B\uC790 \uAC12\uC744 \uC62C\uBC14\uB974\uAC8C \uC785\uB825\uD574\uC8FC\uC138\uC694.");
    return;
  }

  try {
    await updateDoc(rubyDocRef, {
      current: Math.floor(next),
      updated_at: serverTimestamp()
    });
  } catch (err) {
    window.alert("\uC218\uC815 \uC2E4\uD328: " + String(err));
  }
}

function bindEvents() {
  elEditBtn?.addEventListener("click", editCurrentValue);
  window.addEventListener("storage", applyAdminUI);
  window.addEventListener("focus", applyAdminUI);
  document.addEventListener("visibilitychange", applyAdminUI);
  setInterval(applyAdminUI, 1000);
}

function bindRealtime() {
  onSnapshot(rubyDocRef, (snap) => {
    if (!snap.exists()) {
      latestData = { current: 0, max: 1, state: "-" };
      renderRuby(latestData);
      return;
    }

    latestData = {
      current: Number(snap.data()?.current || 0),
      max: Number(snap.data()?.max || 1),
      state: String(snap.data()?.state || "-")
    };
    renderRuby(latestData);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initPath();
  applyAdminUI();
  bindEvents();
  bindRealtime();
});
