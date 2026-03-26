let profileData = [];
let selectedIndex = -1;
let csvRows = [];

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

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === "\"") {
      const next = line[i + 1];
      if (inQuotes && next === "\"") {
        cur += "\"";
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
    csvMap.set(row.name, row);
  });

  profileData = profileData.map((member) => {
    const key = String(member.gc_name || "").trim();
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

function downloadJson() {
  syncEditorToCurrentMember();
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

function handleCsvFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      csvRows = parseCsv(String(reader.result || ""));
      alert(`CSV 로드 완료: ${csvRows.length}명`);
    } catch (err) {
      alert("CSV 파싱 실패: " + String(err));
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
  document.getElementById("downloadBtn")?.addEventListener("click", downloadJson);
}

bindEvents();
