let whoData = [];

let totalSearchCount = 0;
let serverCountMap = {};

const classMap = {
  AbyssRevenant: "심연추적자",
  Enforcer: "집행관",
  SolarSentinel: "태양감시자",
  RuneScribe: "주문각인사",
  MirageBlade: "환영검사",
  WildWarrior: "야만전사",
  IncenseArcher: "향사수"
};

const worldMap = {
  "2-1":"론도1","2-2":"론도2","2-3":"론도3","2-4":"론도4","2-5":"론도5",
  "3-1":"라인소프1","3-2":"라인소프2","3-3":"라인소프3","3-4":"라인소프4","3-5":"라인소프5",
  "5-1":"아민타1","5-2":"아민타2","5-3":"아민타3","5-4":"아민타4","5-5":"아민타5",
  "8-1":"가리안1","8-2":"가리안2","8-3":"가리안3","8-4":"가리안4","8-5":"가리안5",
  "10-1":"사도바1","10-2":"사도바2","10-3":"사도바3","10-4":"사도바4","10-5":"사도바5",
  "11-1":"제롬1","11-2":"제롬2","11-3":"제롬3","11-4":"제롬4","11-5":"제롬5",
  "12-1":"아티산1","12-2":"아티산2","12-3":"아티산3","12-4":"아티산4","12-5":"아티산5",
  "14-1":"나세르1","14-2":"나세르2","14-3":"나세르3","14-4":"나세르4","14-5":"나세르5",
  "16-1":"타리아1","16-2":"타리아2","16-3":"타리아3","16-4":"타리아4","16-5":"타리아5",
  "27-1":"메르비스1","27-2":"메르비스2","27-3":"메르비스3","27-4":"메르비스4","27-5":"메르비스5"
};

async function fetchJsonWithFallback(paths) {
  for (const path of paths) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) continue;
      return await res.json();
    } catch (_err) {
      // continue
    }
  }
  throw new Error(`JSON load failed: ${paths.join(", ")}`);
}

window.onload = async function onLoad() {
  try {
    const data = await fetchJsonWithFallback([
      "data/Who_are_you.json",
      "Who_are_you.json"
    ]);

    if (!Array.isArray(data)) {
      throw new Error("Who_are_you.json structure is invalid");
    }

    whoData = data;
    renderTable(whoData.slice(0, 100));
    updateTrackingUI();
  } catch (err) {
    const tbody = document.getElementById("whoBody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7">데이터 로드 실패: ${String(err.message || err)}</td></tr>`;
    }
    console.error(err);
  }
};

function resetTracking() {
  totalSearchCount = 0;
  serverCountMap = {};
  renderTable(whoData.slice(0, 100));
  updateTrackingUI();
}
window.resetTracking = resetTracking;

function searchPlayer() {
  const fRank = document.getElementById("f_rank")?.value?.trim();
  const fLevel = document.getElementById("f_level")?.value?.trim();
  const fGrade = document.getElementById("f_grade")?.value?.trim();
  const fClass = document.getElementById("f_class")?.value?.trim();
  const fName = document.getElementById("f_name")?.value?.toLowerCase()?.trim();

  let filtered = whoData.filter((p) => {
    if (fRank && String(p.ranking) !== fRank) return false;
    if (fLevel && String(p.level) !== fLevel) return false;
    if (fGrade && String(p.grade) !== fGrade) return false;
    if (fClass && p.class !== fClass) return false;
    if (fName && !String(p.name || "").toLowerCase().includes(fName)) return false;
    return true;
  });

  filtered = filtered.sort((a, b) => Number(a.ranking || 0) - Number(b.ranking || 0)).slice(0, 100);

  const uniqueServers = new Set(filtered.map((p) => p.world));
  uniqueServers.forEach((world) => {
    serverCountMap[world] = (serverCountMap[world] || 0) + 1;
  });
  totalSearchCount += 1;

  updateTrackingUI();
  renderTable(filtered);
}
window.searchPlayer = searchPlayer;

function updateTrackingUI() {
  const box = document.getElementById("trackingBox");
  if (!box) return;

  let html = `<div>총 검색: ${totalSearchCount}회</div>`;

  Object.entries(serverCountMap)
    .sort((a, b) => b[1] - a[1])
    .forEach(([world, count]) => {
      const percent = totalSearchCount > 0 ? Math.round((count / totalSearchCount) * 100) : 0;
      html += `<div>${worldMap[world] || world} : ${count} / ${totalSearchCount} (${percent}%)</div>`;
    });

  box.innerHTML = html;
}

function renderTable(list) {
  const tbody = document.getElementById("whoBody");
  if (!tbody) return;

  if (!Array.isArray(list) || !list.length) {
    tbody.innerHTML = `<tr><td colspan="7">검색 결과 없음</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((p) => {
    const count = serverCountMap[p.world] || 0;
    const percent = totalSearchCount > 0 ? Math.round((count / totalSearchCount) * 100) : 0;

    return `
      <tr>
        <td onclick="openServerModal('${String(p.world || "").replace(/'/g, "\\'")}')">${worldMap[p.world] || p.world || "-"}</td>
        <td>${p.ranking ?? "-"}</td>
        <td>${p.guild || "-"}</td>
        <td title="${p.name || ""}">${p.name || "-"}</td>
        <td>${p.grade ?? "-"}</td>
        <td>${classMap[p.class] || p.class || "-"}</td>
        <td>${count > 0 ? `${count} / ${totalSearchCount} (${percent}%)` : "-"}</td>
      </tr>
    `;
  }).join("");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchPlayer();
});

function openServerModal(worldKey) {
  const serverName = worldMap[worldKey] || worldKey;
  const serverData = whoData.filter((p) => p.world === worldKey);
  renderServerModal(serverName, serverData);
}
window.openServerModal = openServerModal;

function renderServerModal(serverName, list) {
  const title = document.getElementById("modalTitle");
  const tbody = document.getElementById("modalBody");
  const modal = document.getElementById("serverModal");
  if (!title || !tbody || !modal) return;

  title.innerText = `${serverName} 서버`;

  tbody.innerHTML = [...list]
    .sort((a, b) => Number(a.ranking || 0) - Number(b.ranking || 0))
    .map((p) => `
      <tr>
        <td>${p.ranking ?? "-"}</td>
        <td>${p.name || "-"}</td>
        <td>${p.level ?? "-"}</td>
        <td>${classMap[p.class] || p.class || "-"}</td>
      </tr>
    `)
    .join("");

  modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("serverModal");
  if (modal) modal.style.display = "none";
}
window.closeModal = closeModal;
