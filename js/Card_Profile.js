let cardProfiles = [];
let renderCount = 20;

const classImageMap = {
  AbyssRevenant: "AbyssRevenant",
  Enforcer: "Enforcer",
  SolarSentinel: "SolarSentinel",
  RuneScribe: "RuneScribe",
  MirageBlade: "MirageBlade",
  WildWarrior: "WildWarrior",
  IncenseArcher: "IncenseArcher"
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeProfile(raw) {
  return {
    gc_name: raw.gc_name || raw.name || "-",
    gc_level: raw.gc_level ?? raw.level ?? "-",
    grade: raw.grade ?? "-",
    class: raw.class || "RuneScribe",
    power: raw.power ?? raw.battle_power ?? raw.combat_power ?? "-",
    guild_rank: raw.guild_rank ?? raw.guild_grade ?? raw.guild_title ?? "-",
    feature: raw.feature ?? raw.trait ?? "-"
  };
}

function formatLevel(value) {
  const v = String(value ?? "").trim();
  if (!v || v === "-") return "Lv.-";
  return v.toLowerCase().startsWith("lv.") ? v : `Lv.${v}`;
}

function formatGrade(value) {
  const v = String(value ?? "").trim();
  if (!v || v === "-") return "토벌 -";
  return v.includes("토벌") ? v : `토벌 ${v}`;
}

function getClassImage(cls, tone) {
  const key = classImageMap[cls] || "RuneScribe";
  return `assets/classes/${key}_${tone}.png`;
}

function renderProfiles() {
  const grid = document.getElementById("profileGrid");
  const loadMore = document.getElementById("loadMoreBtn");
  if (!grid || !loadMore) return;

  if (!cardProfiles.length) {
    grid.innerHTML = '<div class="profile-empty">Card_Profile.json 데이터가 없습니다.</div>';
    loadMore.style.display = "none";
    return;
  }

  const list = cardProfiles.slice(0, renderCount);
  grid.innerHTML = list.map((item, idx) => {
    const p = normalizeProfile(item);
    const grayImage = getClassImage(p.class, "gray");
    const goldImage = getClassImage(p.class, "gold");

    return `
      <article class="profile-card" data-index="${idx}">
        <div class="profile-card-inner">
          <section class="profile-face profile-front" style="--gold-image:url('${goldImage}'); background-image:url('${grayImage}')">
            <div class="front-overlay">
              <div class="front-bottom">
                <div class="front-stats">
                  <span>${escapeHtml(formatLevel(p.gc_level))}</span>
                  <span>${escapeHtml(formatGrade(p.grade))}</span>
                </div>
                <div class="front-rule"></div>
                <div class="front-name">${escapeHtml(p.gc_name)}</div>
                <div class="front-rule"></div>
              </div>
            </div>
          </section>

          <section class="profile-face profile-back">
            <div class="back-overlay">
              <div class="back-item">
                <div class="back-label">전투력</div>
                <div class="back-value">${escapeHtml(p.power)}</div>
              </div>
              <div class="back-item">
                <div class="back-label">결사등급</div>
                <div class="back-value">${escapeHtml(p.guild_rank)}</div>
              </div>
              <div class="back-item">
                <div class="back-label">특징</div>
                <div class="back-value">${escapeHtml(p.feature)}</div>
              </div>
            </div>
          </section>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".profile-card").forEach((card) => {
    card.addEventListener("click", () => {
      card.classList.toggle("flipped");
    });
  });

  loadMore.style.display = renderCount < cardProfiles.length ? "inline-block" : "none";
}

async function init() {
  const loadMore = document.getElementById("loadMoreBtn");
  loadMore?.addEventListener("click", () => {
    renderCount += 20;
    renderProfiles();
  });

  try {
    const json = await fetchJsonWithFallback([
      "data/Card_Profile.json",
      "Card_Profile.json"
    ]);
    cardProfiles = Array.isArray(json) ? json : (json.items || []);
  } catch (_err) {
    cardProfiles = [];
  }

  renderProfiles();
}

init();
