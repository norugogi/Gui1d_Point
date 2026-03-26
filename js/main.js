let players = [];
let rawData = [];
let currentFilter = "ALL";

const classNameMap = {
  AbyssRevenant: "심연추적자",
  Enforcer: "집행관",
  SolarSentinel: "태양감시자",
  RuneScribe: "룬각인사",
  MirageBlade: "환영검사",
  WildWarrior: "야성전사",
  IncenseArcher: "향사수"
};

const chartRefs = {
  levelStats: null,
  classStats: null,
  gradeStats: null
};

async function fetchJsonWithFallback(paths) {
  for (const path of paths) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) continue;
      return await res.json();
    } catch (_err) {
      // Try next path.
    }
  }
  throw new Error(`JSON load failed: ${paths.join(", ")}`);
}

function normalizeGuildName(name) {
  if (!name) return "";
  if (String(name).startsWith("CAT")) return "CAT";
  if (String(name).startsWith("DOG")) return "DOG";
  return String(name);
}

function showPage(id, el) {
  document.querySelectorAll(".page").forEach((p) => {
    p.style.display = "none";
  });

  const target = document.getElementById(id);
  if (target) target.style.display = "block";

  document.querySelectorAll(".menu-item").forEach((m) => {
    m.classList.remove("active");
  });

  if (el) el.classList.add("active");

  if (id === "guildListPage") applyListFilter();
  if (id === "guildStatPage") buildGuildStat(players);
  if (id === "mainPage") {
    updateSummary(rawData);
    buildStats(rawData);
  }
}
window.showPage = showPage;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await fetchJsonWithFallback([
      "data/catdog_all_in_one.json",
      "catdog_all_in_one.json"
    ]);

    players = Array.isArray(data) ? data : [];
    rawData = players;

    updateSummary(rawData);
    buildStats(rawData);
    initClassFilter();
    applyListFilter();
  } catch (err) {
    console.error(err);
  }

  document.querySelectorAll("input[name='guildFilter']").forEach((r) => {
    r.addEventListener("change", function onRadioChange() {
      currentFilter = this.value;
      applyFilter();
    });
  });

  document.getElementById("guildFilterSelect")?.addEventListener("change", applyListFilter);
  document.getElementById("classFilterSelect")?.addEventListener("change", applyListFilter);
});

function updateSummary(data) {
  const total = document.getElementById("total");
  const dog = document.getElementById("dog");
  const cat = document.getElementById("cat");
  if (!total || !dog || !cat) return;

  const dogCount = data.filter((p) => normalizeGuildName(p.guild_name) === "DOG").length;
  const catCount = data.filter((p) => normalizeGuildName(p.guild_name) === "CAT").length;

  total.innerText = String(data.length);
  dog.innerText = String(dogCount);
  cat.innerText = String(catCount);
}

function applyFilter() {
  let filtered = rawData;

  if (currentFilter === "DOG") {
    filtered = rawData.filter((p) => normalizeGuildName(p.guild_name) === "DOG");
  }

  if (currentFilter === "CAT") {
    filtered = rawData.filter((p) => normalizeGuildName(p.guild_name) === "CAT");
  }

  updateSummary(filtered);
  buildStats(filtered);
}

function applyListFilter() {
  const guild = document.getElementById("guildFilterSelect")?.value ?? "ALL";
  const cls = document.getElementById("classFilterSelect")?.value ?? "ALL";

  let filtered = rawData;

  if (guild === "DOG") {
    filtered = filtered.filter((p) => normalizeGuildName(p.guild_name) === "DOG");
  }

  if (guild === "CAT") {
    filtered = filtered.filter((p) => normalizeGuildName(p.guild_name) === "CAT");
  }

  if (cls !== "ALL") {
    filtered = filtered.filter((p) => (classNameMap[p.class] || p.class) === cls);
  }

  renderList(filtered);
}

function renderList(list) {
  const el = document.getElementById("guildList");
  if (!el) return;

  el.innerHTML = list.map((p) => `
    <tr>
      <td>${normalizeGuildName(p.guild_name) || "-"}</td>
      <td>Lv.${p.gc_level ?? "-"}</td>
      <td>${p.gc_name || "-"}</td>
      <td>${p.grade || "-"}</td>
      <td>${classNameMap[p.class] || p.class || "-"}</td>
    </tr>
  `).join("");
}

function initClassFilter() {
  const select = document.getElementById("classFilterSelect");
  if (!select) return;

  const classes = [...new Set(rawData.map((p) => classNameMap[p.class] || p.class).filter(Boolean))].sort();

  select.innerHTML = "<option value=\"ALL\">직업 전체</option>";
  classes.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function addCount(map, key) {
  const safeKey = key ?? "-";
  map[safeKey] = (map[safeKey] || 0) + 1;
}

function buildStats(data) {
  const levelMap = {};
  const classMap = {};
  const gradeMap = {};

  data.forEach((p) => {
    addCount(levelMap, p.gc_level);
    addCount(classMap, classNameMap[p.class] || p.class);
    addCount(gradeMap, p.grade);
  });

  renderChart("levelStats", levelMap, (a, b) => Number(b) - Number(a));
  renderChart("classStats", classMap, (a, b) => String(a).localeCompare(String(b), "ko"));
  renderChart("gradeStats", gradeMap, (a, b) => Number(b) - Number(a));
}

function renderChart(id, dataMap, sorter) {
  const box = document.getElementById(id);
  if (!box) return;

  const entries = Object.entries(dataMap)
    .sort((a, b) => sorter(a[0], b[0]))
    .slice(0, 10);

  const labels = entries.map((e) => e[0]);
  const values = entries.map((e) => e[1]);

  box.innerHTML = `<canvas id="${id}Chart"></canvas>`;

  if (chartRefs[id]) chartRefs[id].destroy();

  chartRefs[id] = new Chart(document.getElementById(`${id}Chart`), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ["#4da6ff", "#ffaa00", "#33cc99", "#9966ff", "#ff6699", "#ff9933", "#66ccff"],
        borderRadius: 8
      }]
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      onClick: (_evt, elements) => {
        if (!elements.length) return;

        const index = elements[0].index;
        const label = labels[index];

        let list = [];
        if (id === "classStats") list = rawData.filter((p) => (classNameMap[p.class] || p.class) === label);
        if (id === "gradeStats") list = rawData.filter((p) => String(p.grade) === String(label));
        if (id === "levelStats") list = rawData.filter((p) => String(p.gc_level) === String(label));

        openModal(label, list);
      }
    }
  });
}

function buildGuildStat(data) {
  const box = document.getElementById("guildStatBox");
  if (!box) return;

  const levelMap = {};
  const classMap = {};
  const gradeMap = {};

  data.forEach((p) => {
    addCount(levelMap, p.gc_level);
    addCount(classMap, classNameMap[p.class] || p.class);
    addCount(gradeMap, p.grade);
  });

  box.innerHTML = `
    <div class="stat-wrap">
      ${makeStatCard("레벨 통계", levelMap)}
      ${makeStatCard("직업 통계", classMap)}
      ${makeStatCard("등급 통계", gradeMap)}
    </div>
  `;
}

function makeStatCard(title, map) {
  const rows = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join("");

  return `
    <div class="stat-card">
      <h3>${title}</h3>
      <table>
        <tr><th>구분</th><th>인원</th></tr>
        ${rows}
      </table>
    </div>
  `;
}

function openModal(title, list) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalList = document.getElementById("modalList");

  if (!modal || !modalTitle || !modalList) return;

  modalTitle.innerText = title;

  if (!list?.length) {
    modalList.innerHTML = "<div style='text-align:center; padding:20px;'>데이터 없음</div>";
    modal.style.display = "flex";
    return;
  }

  const sorted = [...list].sort((a, b) => Number(b.gc_level || 0) - Number(a.gc_level || 0));

  modalList.innerHTML = sorted.map((p) => `
    <div style="
      display:grid;
      grid-template-columns: 1fr 80px 120px;
      gap:12px;
      align-items:center;
      width:100%;
      max-width:420px;
      margin:0 auto;
      padding:6px 12px;
      border-bottom:1px solid rgba(255,255,255,0.08);
    ">
      <span style="text-align:left;">${p.gc_name || "-"}</span>
      <span style="text-align:right; color:#ffd700;">Lv.${p.gc_level || "-"}</span>
      <span style="text-align:right; opacity:0.7;">${classNameMap[p.class] || p.class || "-"}</span>
    </div>
  `).join("");

  modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "none";
}
window.closeModal = closeModal;

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeSheet();
  }
});

document.getElementById("modal")?.addEventListener("click", function onModalClick(e) {
  if (e.target === this) this.style.display = "none";
});

function openNewTab() {
  window.open(
    "https://docs.google.com/spreadsheets/d/13W8sK_u_MIgDGGutfKIXViYHfK3E4DTjQBL4YPt4SSI/edit?usp=sharing",
    "_blank"
  );
}
window.openNewTab = openNewTab;

function openSheet(url) {
  const modal = document.getElementById("sheetModal");
  const frame = document.getElementById("sheetFrame");
  if (!modal || !frame) return;

  frame.src = "";
  modal.style.display = "block";

  setTimeout(() => {
    frame.src = url;
  }, 80);
}
window.openSheet = openSheet;

function closeSheet() {
  const modal = document.getElementById("sheetModal");
  const frame = document.getElementById("sheetFrame");
  if (!modal || !frame) return;

  modal.style.display = "none";
  frame.src = "";
}
window.closeSheet = closeSheet;
