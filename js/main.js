let players = [];
let rawData = [];
let currentFilter = "ALL";
let scheduleData = [];

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

const barValueLabelPlugin = {
  id: "barValueLabelPlugin",
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    const values = chart.data.datasets[0]?.data || [];
    if (!meta?.data?.length) return;

    ctx.save();
    ctx.fillStyle = "#f3f3f3";
    ctx.font = "bold 12px Arial";
    ctx.textBaseline = "middle";

    meta.data.forEach((bar, i) => {
      const value = values[i];
      const label = String(value);
      const textWidth = ctx.measureText(label).width;
      const x = Math.min(bar.x + 8, chartArea.right - textWidth - 4);
      ctx.fillText(label, x, bar.y);
    });

    ctx.restore();
  }
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

  try {
    const scheduleJson = await fetchJsonWithFallback([
      "data/schedule.json",
      "schedule.json"
    ]);
    scheduleData = Array.isArray(scheduleJson) ? scheduleJson : (scheduleJson.items || []);
  } catch (_err) {
    scheduleData = [];
  }
  renderSchedule();

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

  select.innerHTML = '<option value="ALL">직업 전체</option>';
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

  const levelRangeMap = {};
  for (let lv = 93; lv >= 87; lv -= 1) {
    levelRangeMap[`Lv.${lv}`] = levelMap[lv] || 0;
  }

  const gradeRangeMap = {};
  for (let grade = 25; grade >= 20; grade -= 1) {
    gradeRangeMap[`${grade}`] = gradeMap[grade] || 0;
  }

  renderChart("levelStats", levelRangeMap, (a, b) => Number(String(b).replace("Lv.", "")) - Number(String(a).replace("Lv.", "")));
  renderChart("classStats", classMap, (a, b) => String(a).localeCompare(String(b), "ko"));
  renderChart("gradeStats", gradeRangeMap, (a, b) => Number(b) - Number(a));
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
    plugins: [barValueLabelPlugin],
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
    addCount(levelMap, Number(p.gc_level));
    addCount(classMap, classNameMap[p.class] || p.class);
    addCount(gradeMap, Number(p.grade));
  });

  const levelRows = [];
  for (let lv = 93; lv >= 80; lv -= 1) {
    levelRows.push({
      key: String(lv),
      label: `Lv.${lv}`,
      count: levelMap[lv] || 0
    });
  }

  const classRows = Object.entries(classMap)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({
      key: k,
      label: k,
      count: v
    }));

  const gradeRows = [];
  for (let grade = 25; grade >= 20; grade -= 1) {
    gradeRows.push({
      key: String(grade),
      label: `${grade} 토벌`,
      count: gradeMap[grade] || 0
    });
  }

  box.innerHTML = `
    <div class="stat-wrap">
      ${makeStatCard("레벨 통계 (93 ~ 80)", levelRows, "level")}
      ${makeStatCard("직업 통계", classRows, "class")}
      ${makeStatCard("토벌 통계 (25 ~ 20)", gradeRows, "grade")}
    </div>
  `;

  box.querySelectorAll(".guild-stat-row").forEach((row) => {
    row.addEventListener("click", () => {
      const type = row.getAttribute("data-type");
      const key = decodeURIComponent(row.getAttribute("data-key") || "");
      openGuildStatDetail(type, key);
    });
  });
}

function makeStatCard(title, rows, statType) {
  const bodyRows = rows
    .map((row) => `
      <tr class="guild-stat-row" data-type="${statType}" data-key="${encodeURIComponent(row.key)}">
        <td>${row.label}</td>
        <td>${row.count}</td>
      </tr>
    `)
    .join("");

  return `
    <div class="stat-card">
      <h3>${title}</h3>
      <table>
        <tr><th>구분</th><th>인원</th></tr>
        ${bodyRows}
      </table>
    </div>
  `;
}

function openGuildStatDetail(type, key) {
  let list = [];
  let title = "";

  if (type === "level") {
    list = rawData.filter((p) => String(p.gc_level) === String(key));
    title = `레벨 ${key}`;
  }

  if (type === "class") {
    list = rawData.filter((p) => (classNameMap[p.class] || p.class) === key);
    title = `직업 ${key}`;
  }

  if (type === "grade") {
    list = rawData.filter((p) => String(p.grade) === String(key));
    title = `토벌 ${key}`;
  }

  openModal(title, list);
}

function renderSchedule() {
  const body = document.getElementById("scheduleBody");
  if (!body) return;

  if (!Array.isArray(scheduleData) || !scheduleData.length) {
    body.innerHTML = `
      <tr><td>-</td><td>일정 데이터 없음</td></tr>
      <tr><td>-</td><td>-</td></tr>
      <tr><td>-</td><td>-</td></tr>
      <tr><td>-</td><td>-</td></tr>
      <tr><td>-</td><td>-</td></tr>
    `;
    return;
  }

  const rows = scheduleData.slice(0, 5);
  while (rows.length < 5) {
    rows.push({ day: "", content: "" });
  }

  body.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.day || "-"}</td>
      <td>${row.content || "-"}</td>
    </tr>
  `).join("");
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
      grid-template-columns: 1fr 80px 120px 80px;
      gap:12px;
      align-items:center;
      width:100%;
      max-width:520px;
      margin:0 auto;
      padding:6px 12px;
      border-bottom:1px solid rgba(255,255,255,0.08);
    ">
      <span style="text-align:left;">${p.gc_name || "-"}</span>
      <span style="text-align:right; color:#ffd700;">Lv.${p.gc_level || "-"}</span>
      <span style="text-align:right; opacity:0.7;">${classNameMap[p.class] || p.class || "-"}</span>
      <span style="text-align:right; opacity:0.9;">${p.grade || "-"}토벌</span>
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
