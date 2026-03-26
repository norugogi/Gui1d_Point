let players = [];
let rawData = [];
let rubyData = [];
let currentFilter = "ALL";

const classMap = {
  AbyssRevenant:"심연추방자",
  Enforcer:"집행관",
  SolarSentinel:"태양감시자",
  RuneScribe:"주문각인사",
  MirageBlade:"환영검사",
  WildWarrior:"야만투사",
  IncenseArcher:"향사수"
};

/* =====================
   🔥 그래프 숫자 플러그인
===================== */
Chart.register({
  id: 'valueLabel',
  afterDatasetsDraw(chart) {

    const { ctx } = chart;

    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);

      meta.data.forEach((bar, index) => {

        const value = dataset.data[index];

        ctx.fillStyle = "#d4af37"; // 골드
        ctx.font = "12px Pretendard";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        const x = bar.x + 8;
        const y = bar.y;

        ctx.fillText(value + "명", x, y);
      });
    });
  }
});

/* =====================
   페이지 전환
===================== */
function showPage(id, el){

  document.querySelectorAll(".page")
    .forEach(p=>p.style.display="none");

  const target = document.getElementById(id);
  if(target) target.style.display="block";

  document.querySelectorAll(".menu-item")
    .forEach(m=>m.classList.remove("active"));

  if(el) el.classList.add("active");

  if(id==="guildListPage"){
    applyListFilter();
  }

  if(id==="guildStatPage"){
    buildGuildStat(players);
  }

  if(id==="rubyPage"){
    renderRuby();
  }

  if(id==="mainPage"){
    updateSummary(rawData);
    buildStats(rawData);
  }
}

/* =====================
   초기 로딩
===================== */
document.addEventListener("DOMContentLoaded",()=>{

  fetch("data/catdog_all_in_one.json")
  .then(res=>res.json())
  .then(data=>{
    players = data;
    rawData = data;

    updateSummary(data);
    buildStats(data);
    initClassFilter();
  });

  fetch("data/ruby_ranking.json")
  .then(res=>res.json())
  .then(data=>{
    rubyData = data;
  });

  document.querySelectorAll("input[name='guildFilter']")
    .forEach(r=>{
      r.addEventListener("change",function(){
        currentFilter = this.value;
        applyFilter();
      });
    });

  document.getElementById("guildFilterSelect")?.addEventListener("change",applyListFilter);
  document.getElementById("classFilterSelect")?.addEventListener("change",applyListFilter);
});

/* =====================
   요약
===================== */
function updateSummary(data){
  const total = document.getElementById("total");
  const dog = document.getElementById("dog");
  const cat = document.getElementById("cat");

  if(!total || !dog || !cat) return;

  total.innerText = data.length;
  dog.innerText = data.filter(p=>p.guild_name?.includes("DOG")).length;
  cat.innerText = data.filter(p=>p.guild_name?.includes("CAT")).length;
}

/* =====================
   메인 필터
===================== */
function applyFilter(){

  let filtered = rawData;

  if(currentFilter==="DOG"){
    filtered = rawData.filter(p=>p.guild_name==="DOG");
  }

  if(currentFilter==="CAT"){
    filtered = rawData.filter(p=>p.guild_name?.includes("CAT"));
  }

  updateSummary(filtered);
  buildStats(filtered);
}

/* =====================
   리스트 필터
===================== */
function applyListFilter(){

  let guild = document.getElementById("guildFilterSelect")?.value;
  let cls = document.getElementById("classFilterSelect")?.value;

  let filtered = rawData;

  if(guild === "DOG"){
    filtered = filtered.filter(p=>p.guild_name==="DOG");
  }

  if(guild === "CAT"){
    filtered = filtered.filter(p=>p.guild_name?.includes("CAT"));
  }

  if(cls !== "ALL"){
    filtered = filtered.filter(p=>
      (classMap[p.class] || p.class) === cls
    );
  }

  render(filtered);
}

/* =====================
   리스트 렌더
===================== */
function render(list){

  const el = document.getElementById("guildList");
  if(!el) return;

  let html="";

  list.forEach(p=>{
    html += `
      <tr>
        <td>${p.guild_name || ""}</td>
        <td>Lv.${p.gc_level}</td>
        <td>${p.gc_name}</td>
        <td>${p.grade || ""}</td>
        <td>${classMap[p.class] || p.class}</td>
      </tr>
    `;
  });

  el.innerHTML = html;
}

/* =====================
   직업 필터
===================== */
function initClassFilter(){

  const select = document.getElementById("classFilterSelect");
  if(!select) return;

  select.innerHTML = `<option value="ALL">전체</option>`;

  let classes = [...new Set(rawData.map(p=>classMap[p.class] || p.class))];

  classes.sort();

  classes.forEach(c=>{
    let opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

/* =====================
   통계 (그래프)
===================== */
function buildStats(data){

  let levelMap={}, classMap2={}, gradeMap={};

  data.forEach(p=>{
    add(levelMap,p.gc_level);
    add(classMap2,classMap[p.class]||p.class);
    add(gradeMap,p.grade);
  });

  renderChart("levelStats",levelMap);
  renderChart("classStats",classMap2);
  renderChart("gradeStats",gradeMap);
}

function add(map,key){
  map[key] = (map[key] || 0) + 1;
}

/* =====================
   🔥 개선된 그래프
===================== */
function renderChart(id,data){

  const box = document.getElementById(id);
  if(!box) return;

  let entries = Object.entries(data)
    .sort((a,b)=>Number(b[0]) - Number(a[0]))
    .slice(0,7);

  let labels = entries.map(e=>e[0]);
  let values = entries.map(e=>e[1]);

  box.innerHTML = `<canvas id="${id}Chart"></canvas>`;

  new Chart(document.getElementById(id+"Chart"),{
    type:'bar',
    data:{
      labels,
      datasets:[{
        data:values,
        backgroundColor: values.map(()=> "rgba(212,175,55,0.8)"),
        borderColor:"#d4af37",
        borderWidth:1,
        borderRadius:10
      }]
    },
    options:{
      indexAxis:'y',
      plugins:{legend:{display:false}},

      scales:{
        x:{
          beginAtZero:true,
          grace:'15%',
          grid:{color:"rgba(255,255,255,0.05)"},
          ticks:{color:"#aaa"}
        },
        y:{
          grid:{display:false},
          ticks:{color:"#ddd"}
        }
      },

      onClick: (e, elements) => {

        if(elements.length === 0) return;

        const index = elements[0].index;
        const label = labels[index];

        let list = [];

        if(id === "classStats"){
          list = rawData.filter(p => (classMap[p.class] || p.class) == label);
        }

        if(id === "gradeStats"){
          list = rawData.filter(p => String(p.grade) == String(label));
        }

        if(id === "levelStats"){
          list = rawData.filter(p => String(p.gc_level) == String(label));
        }

        openModal(label, list);
      }
    }
  });
}

/* =====================
   결사 통계
===================== */
function buildGuildStat(data){

  const box = document.getElementById("guildStatBox");
  if(!box) return;

  let levelMap = {};
  let classMap2 = {};
  let gradeMap = {};

  data.forEach(p=>{
    add(levelMap,p.gc_level);
    add(classMap2,classMap[p.class]||p.class);
    add(gradeMap,p.grade);
  });

  box.innerHTML = `
    <div class="stat-wrap">
      ${makeStatCard("레벨 통계", levelMap)}
      ${makeStatCard("직업 통계", classMap2)}
      ${makeStatCard("토벌 통계", gradeMap)}
    </div>
  `;
}

function makeStatCard(title, map){

  let html = `
    <div class="stat-card">
      <h3>${title}</h3>
      <table>
        <tr><th>구분</th><th>인원</th></tr>
  `;

  Object.entries(map)
    .sort((a,b)=>b[1]-a[1])
    .forEach(([k,v])=>{
      html += `<tr><td>${k}</td><td>${v}</td></tr>`;
    });

  html += `
      </table>
    </div>
  `;

  return html;
}

/* =====================
   루비
===================== */
function renderRuby(){

  const table = document.getElementById("rubyTable");
  if(!table || !rubyData.length) return;

  let html="";

  rubyData
    .sort((a,b)=>b.score-a.score)
    .forEach((p,i)=>{
      html += `
      <tr>
        <td>${i+1}</td>
        <td>${p.name}</td>
        <td>${p.guild}</td>
        <td>${p.score.toLocaleString()}</td>
      </tr>`;
    });

  table.innerHTML = html;
}

/* =====================
   모달
===================== */
function openModal(title, list){

  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalList = document.getElementById("modalList");

  if(!modal || !modalTitle || !modalList) return;

  modalTitle.innerText = title;

  if(!list || list.length === 0){
    modalList.innerHTML = "<div style='text-align:center; padding:20px;'>데이터 없음</div>";
    modal.style.display = "flex";
    return;
  }

  const sorted = [...list].sort((a,b)=>b.gc_level - a.gc_level);

  let html = "";

  sorted.forEach(p=>{
    html += `
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
        <span style="text-align:left;">${p.gc_name}</span>
        <span style="text-align:right; color:#ffd700;">Lv.${p.gc_level}</span>
        <span style="text-align:right; opacity:0.7;">${classMap[p.class] || p.class}</span>
      </div>
    `;
  });

  modalList.innerHTML = html;
  modal.style.display = "flex";
}

document.addEventListener("keydown", function(e){
  if(e.key === "Escape"){
    closeModal();
  }
});

document.getElementById("modal")?.addEventListener("click", function(e){
  if(e.target === this){
    this.style.display = "none";
  }
});

function closeModal(){
  const modal = document.getElementById("modal");
  if(modal) modal.style.display = "none";
}
