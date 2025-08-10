document.addEventListener("DOMContentLoaded", () => {
  const spese = JSON.parse(localStorage.getItem("spese")) || [];

  // Helper: totale di una spesa (somma prezzi prodotti)
  const totaleSpesaProdotti = s => (s.prodotti || []).reduce((a,b) => a + (Number(b.prezzo)||0), 0);

  // Impostare range ultimi 7 giorni (incluso oggi)
  const oggi = new Date();
  const start = new Date(oggi);
  start.setDate(oggi.getDate() - 6);

  // Filtra spese negli ultimi 7 giorni
  const speseSettimana = spese.filter(s => {
    const d = new Date(s.data);
    return d >= start && d <= oggi;
  });

  // KPI
  const totaleSettimana = speseSettimana.reduce((sum, s) => sum + totaleSpesaProdotti(s), 0);
  document.getElementById("totaleSettimana").textContent = totaleSettimana.toFixed(2) + "€";

  const totaliPerSpesa = spese.map(s => totaleSpesaProdotti(s));
  if (totaliPerSpesa.length > 0) {
    document.getElementById("spesaMax").textContent = Math.max(...totaliPerSpesa).toFixed(2) + "€";
    document.getElementById("spesaMin").textContent = Math.min(...totaliPerSpesa).toFixed(2) + "€";
  } else {
    document.getElementById("spesaMax").textContent = "—";
    document.getElementById("spesaMin").textContent = "—";
  }

  document.getElementById("numSpese").textContent = spese.length;

  // Grafico andamento: prepara etichette per i 7 giorni
  const labels = [];
  const values = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = day.toLocaleDateString('it-IT');
    labels.push(key);
    values.push(0);
  }
  // Popola dati
  speseSettimana.forEach(s => {
    const key = new Date(s.data).toLocaleDateString('it-IT');
    const idx = labels.indexOf(key);
    if (idx >= 0) values[idx] += totaleSpesaProdotti(s);
  });

  // Render andamento
  new Chart(document.getElementById("graficoAndamento"), {
    type: 'bar',
    data: { labels, datasets: [{ label: '€ spesi', data: values, backgroundColor: '#3b82f6' }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });

  // Grafico supermercati (pie)
  const perSupermercato = {};
  spese.forEach(s => {
    const k = s.supermercato || "Altro";
    perSupermercato[k] = (perSupermercato[k] || 0) + totaleSpesaProdotti(s);
  });
  new Chart(document.getElementById("graficoSupermercati"), {
    type: 'pie',
    data: { labels: Object.keys(perSupermercato), datasets: [{ data: Object.values(perSupermercato), backgroundColor: generateColors(Object.keys(perSupermercato).length) }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // Grafico tipologia (pie)
  const perTipologia = {};
  spese.forEach(s => {
    (s.prodotti || []).forEach(p => {
      const k = p.tipologia || "Altro";
      perTipologia[k] = (perTipologia[k] || 0) + (Number(p.prezzo)||0);
    });
  });
  new Chart(document.getElementById("graficoTipologia"), {
    type: 'pie',
    data: { labels: Object.keys(perTipologia), datasets: [{ data: Object.values(perTipologia), backgroundColor: generateColors(Object.keys(perTipologia).length) }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // utility: palette dinamica
  function generateColors(n) {
    const palette = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#34495e','#1abc9c','#e67e22','#f39c12','#2980b9'];
    const out = [];
    for (let i=0;i<n;i++) out.push(palette[i % palette.length]);
    return out;
  }
});