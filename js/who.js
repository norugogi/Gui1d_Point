let whoData = [];

const classMap = {
  AbyssRevenant: "심연추적자",
  Enforcer: "집행관",
  SolarSentinel: "태양감시자",
  RuneScribe: "룬각인사",
  MirageBlade: "환영검사",
  WildWarrior: "야성전사",
  IncenseArcher: "향사수"
};

const worldMap = {
  "2-1": "로도스1", "2-2": "로도스2", "2-3": "로도스3", "2-4": "로도스4", "2-5": "로도스5",
  "3-1": "라인호프1", "3-2": "라인호프2", "3-3": "라인호프3", "3-4": "라인호프4", "3-5": "라인호프5",
  "5-1": "헤르스1", "5-2": "헤르스2", "5-3": "헤르스3", "5-4": "헤르스4", "5-5": "헤르스5",
  "8-1": "가리안1", "8-2": "가리안2", "8-3": "가리안3", "8-4": "가리안4", "8-5": "가리안5",
  "10-1": "바도르1", "10-2": "바도르2", "10-3": "바도르3", "10-4": "바도르4", "10-5": "바도르5",
  "11-1": "세닉1", "11-2": "세닉2", "11-3": "세닉3", "11-4": "세닉4", "11-5": "세닉5",
  "12-1": "카티아1", "12-2": "카티아2", "12-3": "카티아3", "12-4": "카티아4", "12-5": "카티아5",
  "14-1": "세세루1", "14-2": "세세루2", "14-3": "세세루3", "14-4": "세세루4", "14-5": "세세루5",
  "16-1": "타리아1", "16-2": "타리아2", "16-3": "타리아3", "16-4": "타리아4", "16-5": "타리아5",
  "27-1": "메루비스1", "27-2": "메루비스2", "27-3": "메루비스3", "27-4": "메루비스4", "27-5": "메루비스5"
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

window.onload = async function onLoad() {
  try {
    const data = await fetchJsonWithFallback([
      "data/Who_are_you.json",
      "Who_are_you.json"
    ]);

    if (!Array.isArray(data)) {
      console.error("Who_are_you.json 구조 오류", data);
      return;
    }

    whoData = data;
    renderTable(whoData.slice(0, 100));
  } catch (err) {
    console.error("데이터 로드 실패:", err);
  }
};

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
  renderTable(filtered);
}
window.searchPlayer = searchPlayer;

function renderTable(list) {
  const tbody = document.getElementById("whoBody");
  if (!tbody) return;

  if (!Array.isArray(list) || !list.length) {
    tbody.innerHTML = "<tr><td colspan='7'>검색 결과 없음</td></tr>";
    return;
  }

  tbody.innerHTML = list.map((p) => `
    <tr>
      <td onclick="openServerModal('${String(p.world || "").replace(/'/g, "\\'")}')">${worldMap[p.world] || p.world || "-"}</td>
      <td>${p.ranking ?? "-"}</td>
      <td>${p.guild || "-"}</td>
      <td>${p.name || "-"}</td>
      <td>${p.grade ?? "-"}</td>
      <td>${classMap[p.class] || p.class || "-"}</td>
      <td>-</td>
    </tr>
  `).join("");
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
  const body = document.getElementById("modalBody");
  const modal = document.getElementById("serverModal");
  if (!title || !body || !modal) return;

  title.innerText = `${serverName} 서버`;

  body.innerHTML = [...list]
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
