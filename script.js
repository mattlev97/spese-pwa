/* ===========================
   Tracker Spese - script.js
   Salvataggio: localStorage
   Keys:
     - spese_data -> array di spese
     - supermarkets -> array nomi supermercato
   =========================== */

/* ---- costanti storage ---- */
const KEY_SPESA = "spese_data_v1";
const KEY_MARKET = "spese_markets_v1";

/* ---- valori iniziali supermercati (principali Italia) ---- */
const DEFAULT_MARKETS = [
  "Esselunga","Coop","Conad","Carrefour","Lidl","Eurospin","Iper","Pam","Selex","Simply","MD","Sigma","Auchan","Bennet"
];

/* ---- utilità di base ---- */
function uuid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function loadMarkets(){
  const m = JSON.parse(localStorage.getItem(KEY_MARKET) || "null");
  if(!m){ localStorage.setItem(KEY_MARKET, JSON.stringify(DEFAULT_MARKETS)); return DEFAULT_MARKETS.slice(); }
  return m;
}
function saveMarkets(arr){ localStorage.setItem(KEY_MARKET, JSON.stringify(arr)); }

function loadSpese(){
  return JSON.parse(localStorage.getItem(KEY_SPESA) || "[]");
}
function saveSpese(arr){ localStorage.setItem(KEY_SPESA, JSON.stringify(arr)); }

/* ---- inizializzazione UI e navigazione ---- */
const sections = {
  dashboard: document.getElementById("section-dashboard"),
  archive: document.getElementById("section-archive"),
  add: document.getElementById("section-add"),
  settings: document.getElementById("section-settings")
};

document.getElementById("nav-dashboard").addEventListener("click", ()=>show("dashboard"));
document.getElementById("nav-archive").addEventListener("click", ()=>show("archive"));
document.getElementById("nav-add").addEventListener("click", ()=>show("add"));
document.getElementById("nav-settings").addEventListener("click", ()=>show("settings"));

function hideAll(){
  Object.values(sections).forEach(s => s.classList.add("d-none"));
}
function show(name){
  hideAll();
  sections[name].classList.remove("d-none");
  if(name === "dashboard") renderDashboard();
  if(name === "archive") renderArchive();
  if(name === "add") renderAdd();
  if(name === "settings") renderSettings();
}

/* ---- DASHBOARD ---- */
let chartCategory = null;
let chartMarket = null;

function renderDashboard(){
  const container = sections.dashboard;
  container.innerHTML = "";
  const spese = loadSpese();

  // KPI calcoli
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  function sumBetween(start){
    return spese.filter(s => new Date(s.date) >= start).reduce((acc,s)=> acc + (Number(s.total)||0), 0);
  }
  const totalDay = sumBetween(startOfDay);
  const totalMonth = sumBetween(startOfMonth);
  const totalYear = sumBetween(startOfYear);

  let maxSpend = null, minSpend = null;
  spese.forEach(s => {
    const t = Number(s.total)||0;
    if(maxSpend===null || t>maxSpend) maxSpend=t;
    if(minSpend===null || t<minSpend) minSpend=t;
  });

  // Cards KPI
  const kpHtml = `
  <div class="row">
    <div class="col-md-3"><div class="card p-3"><div class="kpi">Giorno</div><div>${totalDay.toFixed(2)} €</div></div></div>
    <div class="col-md-3"><div class="card p-3"><div class="kpi">Mese</div><div>${totalMonth.toFixed(2)} €</div></div></div>
    <div class="col-md-3"><div class="card p-3"><div class="kpi">Anno</div><div>${totalYear.toFixed(2)} €</div></div></div>
    <div class="col-md-3"><div class="card p-3"><div class="kpi">Spesa max / min</div><div>${(maxSpend!==null?maxSpend.toFixed(2)+" € / "+minSpend.toFixed(2)+" €":"n.d.")}</div></div></div>
  </div>
  `;
  container.insertAdjacentHTML("beforeend", kpHtml);

  // Grafici: spesa per tipologia e supermercati
  const chartsHtml = `
    <div class="row mt-3">
      <div class="col-md-6"><div class="card p-3"><h6>Spesa per tipologia</h6><canvas id="catChart"></canvas></div></div>
      <div class="col-md-6"><div class="card p-3"><h6>Supermercati più frequentati</h6><canvas id="marketChart"></canvas></div></div>
    </div>
  `;
  container.insertAdjacentHTML("beforeend", chartsHtml);

  // prepara dati categorie e mercati
  const categoryMap = {};
  const marketMap = {};
  spese.forEach(s => {
    (s.products||[]).forEach(p => {
      const cat = p.tipo || "Altro";
      const val = Number(p.prezzo) || 0;
      categoryMap[cat] = (categoryMap[cat]||0) + val;
    });
    const mk = s.supermercato || "Altro";
    marketMap[mk] = (marketMap[mk]||0) + (Number(s.total)||0);
  });

  // crea chart category
  const catLabels = Object.keys(categoryMap);
  const catData = catLabels.map(l=> categoryMap[l]);
  const ctxCat = document.getElementById("catChart").getContext("2d");
  if(chartCategory) chartCategory.destroy();
  chartCategory = new Chart(ctxCat, {
    type: 'doughnut',
    data: { labels: catLabels, datasets: [{ data: catData }] },
    options: { responsive: true, maintainAspectRatio:false }
  });

  // chart market (top 8)
  const marketEntries = Object.entries(marketMap).sort((a,b)=> b[1]-a[1]).slice(0,8);
  const mLabels = marketEntries.map(e=>e[0]);
  const mData = marketEntries.map(e=>e[1]);
  const ctxM = document.getElementById("marketChart").getContext("2d");
  if(chartMarket) chartMarket.destroy();
  chartMarket = new Chart(ctxM, {
    type: 'bar',
    data: { labels: mLabels, datasets: [{ label: '€', data: mData }] },
    options: { responsive: true, maintainAspectRatio:false }
  });

  // Floating add button
  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-primary btn-floating";
  addBtn.textContent = "+";
  addBtn.title = "Aggiungi spesa";
  addBtn.onclick = ()=> show("add");
  // remove previous floating if any
  const prev = document.querySelector(".btn-floating");
  if(prev) prev.remove();
  document.body.appendChild(addBtn);
}

/* ---- ARCHIVIO ---- */
function renderArchive(){
  const container = sections.archive;
  container.innerHTML = "";
  const spese = loadSpese().sort((a,b)=> new Date(b.date) - new Date(a.date));

  const listHtml = document.createElement("div");
  listHtml.className = "list-group";

  if(spese.length===0){
    container.innerHTML = `<div class="card p-3">Nessuna spesa registrata.</div>`;
    return;
  }

  spese.forEach(s => {
    const item = document.createElement("div");
    item.className = "list-group-item";
    const date = new Date(s.date);
    item.innerHTML = `<div class="d-flex justify-content-between">
        <div><strong>${s.supermercato || "—"}</strong><br><small>${date.toLocaleString()}</small></div>
        <div><strong>${Number(s.total||0).toFixed(2)} €</strong></div>
      </div>
      <div class="mt-2" id="details-${s.id}" style="display:none"></div>
      <div class="mt-2">
        <button class="btn btn-sm btn-outline-primary me-2" onclick="toggleDetails('${s.id}')">Dettagli</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteSpesa('${s.id}')">Rimuovi</button>
      </div>`;
    listHtml.appendChild(item);

    // append details content
    const det = item.querySelector(`#details-${s.id}`);
    det.innerHTML = `<ul>${(s.products||[]).map(p=>`<li>${p.tipo} — ${p.nome} — ${Number(p.prezzo||0).toFixed(2)} € ${p.prezzoKg?`(€/kg ${p.prezzoKg})`:''} ${p.note?`<br><small>${p.note}</small>`:''}</li>`).join("")}</ul>`;
  });

  container.appendChild(listHtml);
}

window.toggleDetails = function(id){
  const el = document.getElementById("details-"+id);
  if(!el) return;
  el.style.display = (el.style.display === "none" ? "block" : "none");
}

window.deleteSpesa = function(id){
  if(!confirm("Confermi eliminazione di questa spesa?")) return;
  const arr = loadSpese().filter(s=> s.id !== id);
  saveSpese(arr);
  renderArchive();
}

/* ---- AGGIUNGI SPESA ---- */
function renderAdd(){
  const container = sections.add;
  container.innerHTML = "";

  const markets = loadMarkets();
  const html = `
  <div class="card p-3">
    <h5>Nuova spesa</h5>
    <div class="mb-2">
      <label>Supermercato</label>
      <select id="selMarket" class="form-select">
        ${markets.map(m=>`<option value="${m}">${m}</option>`).join("")}
      </select>
    </div>
    <div class="mb-2">
      <label>Data</label>
      <input id="inpDate" type="datetime-local" class="form-control" value="${new Date().toISOString().slice(0,16)}">
    </div>
    <div id="cart" class="mb-2">
      <h6>Prodotti</h6>
      <div id="productList"></div>
      <button id="addProductBtn" class="btn btn-sm btn-outline-secondary mt-2">+ Aggiungi prodotto</button>
    </div>
    <div class="mb-2">
      <strong>Totale: <span id="totalDisplay">0.00</span> €</strong>
    </div>
    <div>
      <button id="saveExpenseBtn" class="btn btn-success">Salva spesa</button>
      <button id="cancelAddBtn" class="btn btn-outline-secondary">Annulla</button>
    </div>
  </div>
  `;
  container.innerHTML = html;

  // events
  document.getElementById("addProductBtn").addEventListener("click", addProductRow);
  document.getElementById("saveExpenseBtn").addEventListener("click", saveExpenseFromForm);
  document.getElementById("cancelAddBtn").addEventListener("click", ()=>show("dashboard"));

  // inizializza con una riga prodotto
  addProductRow();
  recalcTotal();
}

function addProductRow(pref = {}) {
  const list = document.getElementById("productList");
  const idr = uuid();
  const div = document.createElement("div");
  div.className = "product-row";
  div.id = "prod-"+idr;
  div.innerHTML = `
    <input placeholder="Tipologia (es. frutta, latticini)" class="form-control form-control-sm tipo" value="${pref.tipo||''}">
    <input placeholder="Nome prodotto" class="form-control form-control-sm nome" value="${pref.nome||''}">
    <input placeholder="Prezzo (€)" type="number" step="0.01" class="form-control form-control-sm prezzo small" value="${pref.prezzo||''}">
    <input placeholder="€/kg (opz.)" class="form-control form-control-sm prezzoKg small" value="${pref.prezzoKg||''}">
    <input placeholder="Note" class="form-control form-control-sm note" value="${pref.note||''}">
    <button class="btn btn-sm btn-danger remove-prod">×</button>
  `;
  list.appendChild(div);

  div.querySelectorAll("input").forEach(i => i.addEventListener("input", recalcTotal));
  div.querySelector(".remove-prod").addEventListener("click", ()=>{ div.remove(); recalcTotal(); });
}

function recalcTotal(){
  const rows = document.querySelectorAll("#productList .product-row");
  let sum = 0;
  rows.forEach(r => {
    const p = Number(r.querySelector(".prezzo").value) || 0;
    sum += p;
  });
  document.getElementById("totalDisplay").textContent = sum.toFixed(2);
}

function saveExpenseFromForm(){
  const market = document.getElementById("selMarket").value;
  const date = document.getElementById("inpDate").value;
  if(!market){ alert("Seleziona supermercato"); return; }
  const rows = document.querySelectorAll("#productList .product-row");
  if(rows.length===0){ alert("Aggiungi almeno un prodotto"); return; }
  const products = [];
  let total = 0;
  for(const r of rows){
    const tipo = r.querySelector(".tipo").value || "Altro";
    const nome = r.querySelector(".nome").value || "";
    const prezzo = Number(r.querySelector(".prezzo").value) || 0;
    const prezzoKg = r.querySelector(".prezzoKg").value || "";
    const note = r.querySelector(".note").value || "";
    products.push({ tipo, nome, prezzo, prezzoKg, note });
    total += prezzo;
  }
  const spesa = { id: uuid(), date: new Date(date).toISOString(), supermercato: market, products, total: Number(total.toFixed(2)) };
  const arr = loadSpese();
  arr.push(spesa);
  saveSpese(arr);
  alert("Spesa salvata");
  show("dashboard");
}

/* ---- IMPOSTAZIONI ---- */
function renderSettings(){
  const container = sections.settings;
  container.innerHTML = "";
  const markets = loadMarkets();
  container.innerHTML = `
    <div class="card p-3">
      <h5>Impostazioni</h5>
      <div class="mb-3">
        <label>Gestione supermercati</label>
        <div id="marketList" class="mb-2"></div>
        <div class="d-flex gap-2">
          <input id="newMarket" class="form-control form-control-sm" placeholder="Nuovo supermercato">
          <button id="addMarketBtn" class="btn btn-sm btn-primary">Aggiungi</button>
        </div>
      </div>
      <div class="mb-3">
        <label>Export / Import archivio</label>
        <div class="d-flex gap-2">
          <button id="exportBtn" class="btn btn-sm btn-outline-success">Export JSON</button>
          <input id="importFile" type="file" accept=".json" class="form-control form-control-sm"/>
        </div>
      </div>
      <div>
        <button id="clearAll" class="btn btn-sm btn-outline-danger">Cancella tutte le spese (ATTENZIONE)</button>
      </div>
    </div>
  `;

  const ml = document.getElementById("marketList");
  function refreshMarketList(){
    ml.innerHTML = markets.map((m,idx)=>`<div class="d-flex justify-content-between align-items-center mb-1"><div>${m}</div><div><button class="btn btn-sm btn-outline-danger" data-idx="${idx}">Rimuovi</button></div></div>`).join("");
    ml.querySelectorAll("button").forEach(b=>{
      b.addEventListener("click", (e)=>{
        const idx = Number(e.target.dataset.idx);
        if(confirm("Rimuovere "+markets[idx]+"?")){
          markets.splice(idx,1);
          saveMarkets(markets);
          renderSettings();
        }
      });
    });
  }
  refreshMarketList();

  document.getElementById("addMarketBtn").addEventListener("click", ()=>{
    const v = document.getElementById("newMarket").value.trim();
    if(!v) return alert("Nome mancante");
    if(markets.includes(v)) return alert("Esiste già");
    markets.push(v);
    saveMarkets(markets);
    renderSettings();
  });

  document.getElementById("exportBtn").addEventListener("click", ()=>{
    const data = { spese: loadSpese(), markets: loadMarkets() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "spese_export.json"; a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("importFile").addEventListener("change", (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      try{
        const data = JSON.parse(ev.target.result);
        if(Array.isArray(data.spese)) saveSpese(data.spese);
        if(Array.isArray(data.markets)) saveMarkets(data.markets);
        alert("Import completato");
        renderSettings();
      }catch(err){ alert("File non valido"); }
    };
    reader.readAsText(file);
  });

  document.getElementById("clearAll").addEventListener("click", ()=>{
    if(!confirm("Eliminare tutte le spese definitivamente?")) return;
    saveSpese([]);
    alert("Archivio cancellato");
    renderSettings();
  });
}

/* ---- avvio app: mostra dashboard ---- */
show("dashboard");
