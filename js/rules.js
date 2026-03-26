fetch("data/rules.json")
.then(res=>res.json())
.then(data=>{

  const box = document.getElementById("ruleBox");

  let html = "";

  Object.values(data).forEach(section=>{

    html += `
      <div class="card">
        <div class="card-title">${section.title}</div>
        <div class="card-body">
    `;

    section.items.forEach(item=>{
      html += `<div class="item">✔ ${item}</div>`;
    });

    html += `
        </div>
      </div>
    `;
  });

  // 🔥 여기로 이동 (핵심)
  box.innerHTML = html;
});
