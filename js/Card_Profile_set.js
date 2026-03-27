let profileData = [];
let selectedIndex = -1;
let csvRows = [];
let scheduleData = [];

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Load failed: ${path}`);
  const buf = await res.arrayBuffer();
  const text = decodeBestTextFromBuffer(buf);
  return JSON.parse(text);
}

function mapFromBaseRow(row) {
  return {
    gc_name: row.gc_name || "",
    gc_level: row.gc_level || "",
    grade: row.grade || "",
    class: row.class || "",
    guild_name: row.guild_name || "",
    power: row.power || "",
    guild_rank: row.guild_rank || "",
    feature: row.feature || ""
  };
}

function normalizeName(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/\s+/g, "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

function decodeBuffer(buffer, encoding) {
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch (_err) {
    return "";
  }
}

function scoreTextQuality(text) {
  const sample = String(text || "").slice(0, 6000);
  const hangul = (sample.match(/[가-힣]/g) || []).length;
  const replacement = (sample.match(/�/g) || []).length;
  const strangeQ = (sample.match(/\?[^\s,\]\}"':]/g) || []).length;
  return (hangul * 3) - (replacement * 5) - (strangeQ * 2);
}

function decodeBestTextFromBuffer(buffer) {
  const candidates = ["utf-8", "euc-kr", "cp949"];
  let bestText = "";
  let bestScore = -Infinity;

  candidates.forEach((enc) => {
    const text = decodeBuffer(buffer, enc);
    const score = scoreTextQuality(text);
    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  });

  return bestText;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function parseCsv(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [];

  const parsed = lines.map(parseCsvLine);
  const first = parsed[0] || [];
  const firstA = String(first[0] || "").replace(/\s/g, "");
  const firstB = String(first[1] || "").replace(/\s/g, "");
  const hasHeader = firstA.includes("닉네임") && firstB.includes("전투력");

  const rows = hasHeader ? parsed.slice(1) : parsed;
  return rows.map((cols) => ({
    name: String(cols[0] || "").trim(),
    power: String(cols[1] || "").trim(),
    guild_rank: String(cols[2] || "").trim(),
    feature: String(cols[3] || "").trim()
  })).filter((row) => row.name);
}

function renderMemberList() {
  const select = document.getElementById("memberSelect");
  if (!select) return;

  select.innerHTML = profileData
    .map((m, i) => `<option value="${i}">${m.gc_name || "(이름없음)"} / Lv.${m.gc_level || "-"} / ${m.class || "-"}</option>`)
    .join("");

  if (profileData.length > 0) {
    select.value = "0";
    selectedIndex = 0;
    loadSelectedMember();
  }
}

function loadSelectedMember() {
  if (selectedIndex < 0 || selectedIndex >= profileData.length) return;
  const m = profileData[selectedIndex];

  document.getElementById("nameInput").value = m.gc_name || "";
  document.getElementById("levelInput").value = m.gc_level || "";
  document.getElementById("gradeInput").value = m.grade || "";
  document.getElementById("classInput").value = m.class || "";
  document.getElementById("powerInput").value = m.power || "";
  document.getElementById("guildRankInput").value = m.guild_rank || "";
  document.getElementById("featureInput").value = m.feature || "";
}

function syncEditorToCurrentMember() {
  if (selectedIndex < 0 || selectedIndex >= profileData.length) return;

  profileData[selectedIndex].power = document.getElementById("powerInput").value.trim();
  profileData[selectedIndex].guild_rank = document.getElementById("guildRankInput").value.trim();
  profileData[selectedIndex].feature = document.getElementById("featureInput").value.trim();
}

function applyCsvMatch() {
  if (!profileData.length) {
    alert("먼저 JSON 데이터를 불러와주세요.");
    return;
  }

  if (!csvRows.length) {
    alert("먼저 CSV 파일을 불러와주세요.");
    return;
  }

  syncEditorToCurrentMember();

  const csvMap = new Map();
  csvRows.forEach((row) => {
    csvMap.set(normalizeName(row.name), row);
  });

  profileData = profileData.map((member) => {
    const key = normalizeName(member.gc_name);
    const hit = csvMap.get(key);

    if (!hit) {
      return {
        ...member,
        power: "-",
        guild_rank: "-",
        feature: "-"
      };
    }

    return {
      ...member,
      power: hit.power || "-",
      guild_rank: hit.guild_rank || "-",
      feature: hit.feature || "-"
    };
  });

  renderMemberList();
  alert("CSV 자동 매칭이 완료되었습니다.");
}

function downloadCardJson() {
  syncEditorToCurrentMember();
  const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Card_Profile.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

async function loadCardDefault() {
  const base = await fetchJson("data/catdog_all_in_one.json");
  profileData = Array.isArray(base) ? base.map(mapFromBaseRow) : [];
  renderMemberList();
}

function handleCardJsonFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = decodeBestTextFromBuffer(reader.result);
      const parsed = JSON.parse(String(text || "[]"));
      profileData = Array.isArray(parsed) ? parsed.map(mapFromBaseRow) : [];
      renderMemberList();
    } catch (err) {
      alert("JSON 파싱 실패: " + String(err));
    }
  };
  reader.readAsArrayBuffer(file);
}

function handleCsvFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = decodeBestTextFromBuffer(reader.result);
      csvRows = parseCsv(String(text || ""));
      alert(`CSV 로드 완료: ${csvRows.length}명`);
    } catch (err) {
      alert("CSV 파싱 실패: " + String(err));
    }
  };
  reader.readAsArrayBuffer(file);
}

function normalizeScheduleRow(row) {
  return {
    day: String(row?.day || "").trim(),
    content: String(row?.content || "").trim()
  };
}

function renderScheduleEditor() {
  const body = document.getElementById("scheduleEditorBody");
  if (!body) return;

  if (!scheduleData.length) {
    scheduleData = [{ day: "", content: "" }];
  }

  body.innerHTML = scheduleData.map((row, idx) => `
    <tr data-index="${idx}">
      <td><input type="text" class="schedule-cell-input schedule-day" value="${escapeHtml(row.day)}" placeholder="예) 3/27(금) 21:00"></td>
      <td><input type="text" class="schedule-cell-input schedule-content" value="${escapeHtml(row.content)}" placeholder="예) 별빛 해방전"></td>
      <td><button type="button" class="row-del-btn" data-del="${idx}">삭제</button></td>
    </tr>
  `).join("");

  body.querySelectorAll(".schedule-day").forEach((input) => {
    input.addEventListener("input", syncScheduleFromEditor);
  });
  body.querySelectorAll(".schedule-content").forEach((input) => {
    input.addEventListener("input", syncScheduleFromEditor);
  });
  body.querySelectorAll(".row-del-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-del"));
      if (Number.isNaN(idx)) return;
      scheduleData.splice(idx, 1);
      renderScheduleEditor();
    });
  });
}

function syncScheduleFromEditor() {
  const body = document.getElementById("scheduleEditorBody");
  if (!body) return;

  const rows = [...body.querySelectorAll("tr")];
  scheduleData = rows.map((tr) => {
    const day = tr.querySelector(".schedule-day")?.value || "";
    const content = tr.querySelector(".schedule-content")?.value || "";
    return normalizeScheduleRow({ day, content });
  });
}

function addScheduleRow() {
  syncScheduleFromEditor();
  scheduleData.push({ day: "", content: "" });
  renderScheduleEditor();
}

async function loadScheduleDefault() {
  const base = await fetchJson("data/schedule.json");
  scheduleData = Array.isArray(base) ? base.map(normalizeScheduleRow) : [];
  renderScheduleEditor();
}

function handleScheduleJsonFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = decodeBestTextFromBuffer(reader.result);
      const parsed = JSON.parse(String(text || "[]"));
      scheduleData = Array.isArray(parsed) ? parsed.map(normalizeScheduleRow) : [];
      renderScheduleEditor();
    } catch (err) {
      alert("스케쥴 JSON 파싱 실패: " + String(err));
    }
  };
  reader.readAsArrayBuffer(file);
}

function downloadScheduleJson() {
  syncScheduleFromEditor();
  const cleaned = scheduleData.filter((row) => row.day || row.content);
  const blob = new Blob([JSON.stringify(cleaned, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "schedule.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function switchTab(tab) {
  const cardBtn = document.getElementById("tabCardBtn");
  const scheduleBtn = document.getElementById("tabScheduleBtn");
  const cardSection = document.getElementById("cardToolSection");
  const scheduleSection = document.getElementById("scheduleToolSection");

  if (!cardBtn || !scheduleBtn || !cardSection || !scheduleSection) return;

  if (tab === "schedule") {
    cardBtn.classList.remove("active");
    scheduleBtn.classList.add("active");
    cardSection.style.display = "none";
    scheduleSection.style.display = "block";
    return;
  }

  scheduleBtn.classList.remove("active");
  cardBtn.classList.add("active");
  scheduleSection.style.display = "none";
  cardSection.style.display = "block";
}

function bindEvents() {
  document.getElementById("tabCardBtn")?.addEventListener("click", () => switchTab("card"));
  document.getElementById("tabScheduleBtn")?.addEventListener("click", () => switchTab("schedule"));

  document.getElementById("loadDefaultBtn")?.addEventListener("click", async () => {
    try {
      await loadCardDefault();
    } catch (err) {
      alert("기본 JSON 로드 실패: " + String(err));
    }
  });

  document.getElementById("sourceJsonInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    handleCardJsonFile(file);
  });

  document.getElementById("sourceCsvInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    handleCsvFile(file);
  });

  document.getElementById("applyCsvBtn")?.addEventListener("click", applyCsvMatch);

  document.getElementById("memberSelect")?.addEventListener("change", (e) => {
    syncEditorToCurrentMember();
    selectedIndex = Number(e.target.value);
    loadSelectedMember();
  });

  document.getElementById("powerInput")?.addEventListener("input", syncEditorToCurrentMember);
  document.getElementById("guildRankInput")?.addEventListener("input", syncEditorToCurrentMember);
  document.getElementById("featureInput")?.addEventListener("input", syncEditorToCurrentMember);

  document.getElementById("downloadBtn")?.addEventListener("click", downloadCardJson);

  document.getElementById("loadScheduleDefaultBtn")?.addEventListener("click", async () => {
    try {
      await loadScheduleDefault();
    } catch (err) {
      alert("기본 schedule.json 로드 실패: " + String(err));
    }
  });

  document.getElementById("scheduleJsonInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    handleScheduleJsonFile(file);
  });

  document.getElementById("addScheduleRowBtn")?.addEventListener("click", addScheduleRow);
  document.getElementById("downloadScheduleBtn")?.addEventListener("click", downloadScheduleJson);
}

function init() {
  bindEvents();
  scheduleData = [{ day: "", content: "" }];
  renderScheduleEditor();
}

init();
