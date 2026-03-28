(function allServerStats() {
  const classNameMap = {
    AbyssRevenant: "심연추방자",
    Enforcer: "집행관",
    SolarSentinel: "태양감시자",
    RuneScribe: "주문각인사",
    MirageBlade: "환영검사",
    WildWarrior: "야만투사",
    IncenseArcher: "향사수"
  };

  const worldMap = {
    "2-1": "론도1", "2-2": "론도2", "2-3": "론도3", "2-4": "론도4", "2-5": "론도5",
    "3-1": "라인소프1", "3-2": "라인소프2", "3-3": "라인소프3", "3-4": "라인소프4", "3-5": "라인소프5",
    "5-1": "아민타1", "5-2": "아민타2", "5-3": "아민타3", "5-4": "아민타4", "5-5": "아민타5",
    "8-1": "가리안1", "8-2": "가리안2", "8-3": "가리안3", "8-4": "가리안4", "8-5": "가리안5",
    "10-1": "사도바1", "10-2": "사도바2", "10-3": "사도바3", "10-4": "사도바4", "10-5": "사도바5",
    "11-1": "제롬1", "11-2": "제롬2", "11-3": "제롬3", "11-4": "제롬4", "11-5": "제롬5",
    "12-1": "아티산1", "12-2": "아티산2", "12-3": "아티산3", "12-4": "아티산4", "12-5": "아티산5",
    "14-1": "나세르1", "14-2": "나세르2", "14-3": "나세르3", "14-4": "나세르4", "14-5": "나세르5",
    "16-1": "타리아1", "16-2": "타리아2", "16-3": "타리아3", "16-4": "타리아4", "16-5": "타리아5",
    "27-1": "메르비스1", "27-2": "메르비스2", "27-3": "메르비스3", "27-4": "메르비스4", "27-5": "메르비스5"
  };

  const LIST_STEP = 100;

  let raw = [];
  let currentType = "level";
  let currentRows = [];
  let selectedKey = null;
  let selectedPlayers = [];
  let visibleCount = LIST_STEP;

  const elStatsTitle = document.getElementById("statsTitle");
  const elStatsColName = document.getElementById("statsColName");
  const elStatsBody = document.getElementById("statsBody");
  const elPlayersTitle = document.getElementById("playersTitle");
  const elPlayersCount = document.getElementById("playersCount");
  const elPlayersBody = document.getElementById("playersBody");
  const elPlayersEmpty = document.getElementById("playersEmpty");
  const elLoadMoreBtn = document.getElementById("loadMoreBtn");

  function n(v) {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  function normalizeGuildName(name) {
    if (!name) return "-";
    if (String(name).startsWith("CAT")) return "CAT";
    if (String(name).startsWith("DOG")) return "DOG";
    return String(name);
  }

  function normalizeRecord(p) {
    return {
      name: String(p.name ?? p.gc_name ?? "-"),
      guild: normalizeGuildName(String(p.guild ?? p.guild_name ?? "-")),
      class: String(p.class ?? p.job ?? "-"),
      level: n(p.level ?? p.gc_level),
      grade: n(p.grade),
      world: String(p.world ?? p.server ?? "")
    };
  }

  function classLabel(v) {
    return classNameMap[v] || v || "-";
  }

  function worldLabel(v) {
    return worldMap[v] || v || "-";
  }

  function statName(type) {
    if (type === "level") return "레벨 통계";
    if (type === "grade") return "토벌 통계";
    return "직업 통계";
  }

  function colName(type) {
    if (type === "level") return "레벨";
    if (type === "grade") return "토벌";
    return "직업";
  }

  function makeStats(type) {
    const map = new Map();
    let baseCount = 0;

    raw.forEach((p) => {
      if (type === "level") {
        if (p.level < 80) return;
        const key = String(p.level);
        map.set(key, (map.get(key) || 0) + 1);
        baseCount += 1;
        return;
      }

      if (type === "grade") {
        if (p.grade < 20) return;
        const key = String(p.grade);
        map.set(key, (map.get(key) || 0) + 1);
        baseCount += 1;
        return;
      }

      const key = classLabel(p.class);
      map.set(key, (map.get(key) || 0) + 1);
      baseCount += 1;
    });

    const rows = [...map.entries()].map(([key, count]) => ({ key, count }));
    if (type === "class") {
      rows.sort((a, b) => a.key.localeCompare(b.key, "ko"));
    } else {
      rows.sort((a, b) => Number(b.key) - Number(a.key));
    }

    return { rows, total: Math.max(1, baseCount) };
  }

  function applyTabUI(type) {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === type);
    });
    elStatsTitle.textContent = statName(type);
    elStatsColName.textContent = colName(type);
  }

  function escapeHtml(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function playersBySelection(type, key) {
    if (type === "level") return raw.filter((p) => String(p.level) === String(key));
    if (type === "grade") return raw.filter((p) => String(p.grade) === String(key));
    return raw.filter((p) => classLabel(p.class) === key);
  }

  function renderPlayers() {
    if (!selectedPlayers.length) {
      elPlayersBody.innerHTML = "";
      elPlayersTitle.textContent = "대상 인원";
      elPlayersCount.textContent = "0명";
      elPlayersEmpty.style.display = "block";
      elLoadMoreBtn.style.display = "none";
      return;
    }

    const shown = selectedPlayers.slice(0, visibleCount);
    elPlayersEmpty.style.display = "none";

    elPlayersTitle.textContent = `${colName(currentType)} ${selectedKey} 대상`;
    elPlayersCount.textContent = `${shown.length.toLocaleString("ko-KR")} / ${selectedPlayers.length.toLocaleString("ko-KR")}명`;

    elPlayersBody.innerHTML = shown.map((p) => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.guild)}</td>
        <td>${escapeHtml(classLabel(p.class))}</td>
        <td class="right">${escapeHtml(String(p.level || "-"))}</td>
        <td class="right">${escapeHtml(String(p.grade || "-"))}</td>
        <td>${escapeHtml(worldLabel(p.world))}</td>
      </tr>
    `).join("");

    elLoadMoreBtn.style.display = shown.length < selectedPlayers.length ? "inline-block" : "none";
  }

  function selectStat(key) {
    selectedKey = key;
    visibleCount = LIST_STEP;
    selectedPlayers = playersBySelection(currentType, key)
      .slice()
      .sort((a, b) => b.level - a.level || b.grade - a.grade || a.name.localeCompare(b.name, "ko"));

    renderPlayers();

    document.querySelectorAll("#statsBody tr").forEach((row) => {
      row.classList.toggle("active", row.dataset.key === key);
    });
  }

  function renderStats(type) {
    const { rows, total } = makeStats(type);
    currentRows = rows;

    if (!rows.length) {
      elStatsBody.innerHTML = '<tr><td colspan="3">데이터가 없습니다.</td></tr>';
      selectedPlayers = [];
      selectedKey = null;
      renderPlayers();
      return;
    }

    elStatsBody.innerHTML = rows.map((row) => {
      const ratio = ((row.count / total) * 100).toFixed(2);
      return `
        <tr data-key="${escapeHtml(row.key)}">
          <td>${escapeHtml(row.key)}</td>
          <td class="right">${row.count.toLocaleString("ko-KR")}</td>
          <td class="right">${ratio}%</td>
        </tr>
      `;
    }).join("");

    elStatsBody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => {
        const key = tr.dataset.key;
        if (!key) return;
        selectStat(key);
      });
    });

    if (!selectedKey || !rows.some((r) => r.key === selectedKey)) {
      selectStat(rows[0].key);
    } else {
      selectStat(selectedKey);
    }
  }

  function showTab(type) {
    currentType = type;
    selectedKey = null;
    selectedPlayers = [];
    visibleCount = LIST_STEP;
    applyTabUI(type);
    renderStats(type);
  }

  async function loadData() {
    const paths = ["data/all_servers_ranking.json", "all_servers_ranking.json"];
    for (const path of paths) {
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) continue;
        const json = await res.json();
        return Array.isArray(json) ? json.map(normalizeRecord) : [];
      } catch (_err) {
        // fallback
      }
    }
    return [];
  }

  function bindEvents() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.tab;
        if (!type) return;
        showTab(type);
      });
    });

    elLoadMoreBtn.addEventListener("click", () => {
      visibleCount += LIST_STEP;
      renderPlayers();
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    bindEvents();
    raw = await loadData();

    if (!raw.length) {
      elStatsBody.innerHTML = '<tr><td colspan="3">데이터를 불러오지 못했습니다.</td></tr>';
      renderPlayers();
      return;
    }

    showTab("level");
  });
})();
