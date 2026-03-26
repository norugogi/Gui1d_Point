let whoData = [];

/***************************************
 * 🔥 추론 시스템 (핵심 추가)
 ***************************************/
let totalSearchCount = 0;      // 총 검색 횟수
let serverCountMap = {};       // 서버별 등장 횟수

function resetTracking(){
  totalSearchCount = 0;
  serverCountMap = {};

  renderTable(whoData.slice(0, 100)); // 화면도 초기화
}

/***************************************
 * 클래스 / 서버 맵
 ***************************************/
const classMap = {
  AbyssRevenant:"심연추방자",
  Enforcer:"집행관",
  SolarSentinel:"태양감시자",
  RuneScribe:"주문각인사",
  MirageBlade:"환영검사",
  WildWarrior:"야만투사",
  IncenseArcher:"향사수"
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

/***************************************
 * 초기 로딩
 ***************************************/
window.onload = function(){

  fetch("data/Who_are_you.json")
  .then(res => res.json())
  .then(data => {

    if(!Array.isArray(data)){
      console.error("JSON 구조 오류", data);
      return;
    }

    whoData = data;

    renderTable(whoData.slice(0, 100));
    updateTrackingUI();
  })
  .catch(err => {
    console.error("데이터 로드 실패:", err);
  });
};

/***************************************
 * 검색
 ***************************************/
function searchPlayer(){

  const f_rank  = document.getElementById("f_rank").value;
  const f_level = document.getElementById("f_level").value;
  const f_grade = document.getElementById("f_grade").value;
  const f_class = document.getElementById("f_class").value;
  const f_name  = document.getElementById("f_name").value.toLowerCase();

  let filtered = whoData.filter(p => {

    if(f_rank && p.ranking != f_rank) return false;
    if(f_level && p.level != f_level) return false;
    if(f_grade && p.grade != f_grade) return false;
    if(f_class && p.class != f_class) return false;
    if(f_name && !p.name.toLowerCase().includes(f_name)) return false;

    return true;
  });

  filtered.sort((a,b) => a.ranking - b.ranking);

  if(filtered.length > 100){
    filtered = filtered.slice(0, 100);
  }

  /***************************************
   * 🔥 핵심: 서버 중복 제거 후 카운팅
   ***************************************/
  const uniqueServers = new Set(filtered.map(p => p.world));

  uniqueServers.forEach(world => {
    if(!serverCountMap[world]){
      serverCountMap[world] = 0;
    }
    serverCountMap[world] += 1;
  });

  totalSearchCount++;

  updateTrackingUI();
  renderTable(filtered);
}

/***************************************
 * 🔥 추적 UI 출력
 ***************************************/
function updateTrackingUI(){

  const box = document.getElementById("trackingBox");
  if(!box) return;

  let html = `<div>총 검색: ${totalSearchCount}회</div>`;

  const sorted = Object.entries(serverCountMap)
    .sort((a,b) => b[1] - a[1]);

  sorted.forEach(([world, count]) => {

    const percent = totalSearchCount > 0
      ? Math.round((count / totalSearchCount) * 100)
      : 0;

    html += `
      <div>
        ${worldMap[world] || world}
        → ${count} / ${totalSearchCount} (${percent}%)
      </div>
    `;
  });

  box.innerHTML = html;
}

/***************************************
 * 테이블 출력
 ***************************************/
function renderTable(list){

  const tbody = document.getElementById("whoBody");

  if(!Array.isArray(list)){
    console.error("배열 아님", list);
    return;
  }

  if(list.length === 0){
    tbody.innerHTML = `<tr><td colspan="7">검색 결과 없음</td></tr>`;
    return;
  }

  let html = "";

  list.forEach(p => {

    const count = serverCountMap[p.world] || 0;
    const percent = totalSearchCount > 0
      ? Math.round((count / totalSearchCount) * 100)
      : 0;

    html += `
    <tr>
      <td onclick="openServerModal('${p.world}')">
        ${worldMap[p.world] || p.world}
      </td>
      <td>${p.ranking}</td>
      <td>${p.guild || "-"}</td>
      <td title="${p.name}">${p.name}</td>
      <td>${p.grade}</td>
      <td>${classMap[p.class] || p.class}</td>
      <td>${count > 0 ? `${count} / ${totalSearchCount} (${percent}%)` : "-"}</td>
    </tr>
    `;
  });

  tbody.innerHTML = html;
}

/***************************************
 * 엔터 검색
 ***************************************/
document.addEventListener("keydown", e => {
  if(e.key === "Enter"){
    searchPlayer();
  }
});

/***************************************
 * 서버 모달
 ***************************************/
function openServerModal(worldKey){

  const serverName = worldMap[worldKey] || worldKey;

  const serverData = whoData.filter(p => p.world === worldKey);

  renderServerModal(serverName, serverData);
}

function renderServerModal(serverName, list){

  document.getElementById("modalTitle").innerText = serverName + " 랭킹";

  const tbody = document.getElementById("modalBody");

  let html = "";

  list
    .sort((a,b) => a.ranking - b.ranking)
    .forEach(p => {

      html += `
      <tr>
        <td>${p.ranking}</td>
        <td>${p.name}</td>
        <td>${p.level}</td>
        <td>${classMap[p.class] || p.class}</td>
      </tr>
      `;
    });

  tbody.innerHTML = html;

  document.getElementById("serverModal").style.display = "block";
}

function closeModal(){
  document.getElementById("serverModal").style.display = "none";
}
