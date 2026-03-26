let profileData = [];
let selectedIndex = -1;

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Load failed: ${path}`);
  return await res.json();
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

function saveCurrentMember() {
  if (selectedIndex < 0 || selectedIndex >= profileData.length) return;

  profileData[selectedIndex].power = document.getElementById("powerInput").value.trim();
  profileData[selectedIndex].guild_rank = document.getElementById("guildRankInput").value.trim();
  profileData[selectedIndex].feature = document.getElementById("featureInput").value.trim();

  alert("현재 멤버 정보가 반영되었습니다.");
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Card_Profile.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

async function loadDefault() {
  const base = await fetchJson("data/catdog_all_in_one.json");
  profileData = Array.isArray(base) ? base.map(mapFromBaseRow) : [];
  renderMemberList();
}

function handleFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "[]"));
      profileData = Array.isArray(parsed) ? parsed.map(mapFromBaseRow) : [];
      renderMemberList();
    } catch (err) {
      alert("JSON 파싱 실패: " + String(err));
    }
  };
  reader.readAsText(file, "utf-8");
}

function bindEvents() {
  document.getElementById("loadDefaultBtn")?.addEventListener("click", async () => {
    try {
      await loadDefault();
    } catch (err) {
      alert("기본 JSON 로드 실패: " + String(err));
    }
  });

  document.getElementById("sourceJsonInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  });

  document.getElementById("memberSelect")?.addEventListener("change", (e) => {
    selectedIndex = Number(e.target.value);
    loadSelectedMember();
  });

  document.getElementById("saveOneBtn")?.addEventListener("click", saveCurrentMember);
  document.getElementById("downloadBtn")?.addEventListener("click", downloadJson);
}

bindEvents();
