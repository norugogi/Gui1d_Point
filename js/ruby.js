(function () {
  let rubyData = [];

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

  function normalizeGroup(group) {
    if (String(group).startsWith("CAT")) return "CAT";
    if (String(group).startsWith("DOG")) return "DOG";
    return String(group || "-");
  }

  function getRubyFilters() {
    return {
      group: document.getElementById("groupFilter")?.value || "all",
      season: document.getElementById("seasonFilter")?.value || "all",
      week: document.getElementById("weekFilter")?.value || "all"
    };
  }

  function initRubyFilters() {
    const seasonSelect = document.getElementById("seasonFilter");
    const weekSelect = document.getElementById("weekFilter");
    const groupFilter = document.getElementById("groupFilter");

    if (!seasonSelect || !weekSelect || !groupFilter) return;

    const seasons = [...new Set(rubyData.map((r) => r.season).filter(Boolean))];
    const weeks = [...new Set(rubyData.map((r) => String(r.week)).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b));

    seasonSelect.innerHTML = '<option value="all">전체 시즌</option>';
    weekSelect.innerHTML = '<option value="all">전체 주차</option>';

    seasons.forEach((s) => {
      seasonSelect.innerHTML += `<option value="${s}">${s}</option>`;
    });

    weeks.forEach((w) => {
      weekSelect.innerHTML += `<option value="${w}">${w}주차</option>`;
    });

    groupFilter.addEventListener("change", renderRuby);
    seasonSelect.addEventListener("change", renderRuby);
    weekSelect.addEventListener("change", renderRuby);
  }

  function renderRuby() {
    if (!rubyData.length) return;

    const filters = getRubyFilters();

    const filtered = rubyData.filter((r) => {
      if (!r || !r.uid || !r.name) return false;
      if (filters.group !== "all" && normalizeGroup(r.group) !== filters.group) return false;
      if (filters.season !== "all" && String(r.season) !== filters.season) return false;
      if (filters.week !== "all" && String(r.week) !== filters.week) return false;
      return true;
    });

    const map = {};
    filtered.forEach((r) => {
      const key = r.uid;
      if (!map[key]) {
        map[key] = {
          uid: r.uid,
          name: r.name,
          group: normalizeGroup(r.group),
          season: r.season,
          week: r.week,
          total: 0,
          weekValue: 0
        };
      }
      map[key].total += Number(r.value || 0);
      map[key].weekValue += Number(r.value || 0);
    });

    const list = Object.values(map).sort((a, b) => b.total - a.total);

    const totalSum = list.reduce((sum, p) => sum + p.total, 0);
    const goal = 50000000;
    const percent = Math.min((totalSum / goal) * 100, 100);

    const bar = document.getElementById("rubyBar");
    const text = document.getElementById("rubyText");
    const percentText = document.getElementById("rubyPercent");

    if (bar) {
      bar.style.width = "0%";
      setTimeout(() => {
        bar.style.width = `${percent}%`;
      }, 80);
    }

    if (text) text.innerText = `${totalSum.toLocaleString()} / ${goal.toLocaleString()}`;
    if (percentText) percentText.innerText = `${percent.toFixed(1)}%`;

    const table = document.getElementById("rubyTable");
    if (!table) return;

    table.innerHTML = list.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.season ?? "-"}</td>
        <td>${p.week ?? "-"}</td>
        <td>${p.group}</td>
        <td>${p.name}</td>
        <td>${p.total.toLocaleString()}</td>
        <td>${p.weekValue.toLocaleString()}</td>
      </tr>
    `).join("");
  }

  async function init() {
    try {
      const payload = await fetchJsonWithFallback([
        "data/ruby_ranking.json",
        "ruby_ranking.json"
      ]);

      rubyData = Array.isArray(payload) ? payload : (payload.data || []);
      initRubyFilters();
      renderRuby();
    } catch (err) {
      console.error(err);
    }
  }

  init();
})();
