document.addEventListener("DOMContentLoaded", () => {
  const spese = JSON.parse(localStorage.getItem("spese")) || [];

  // KPI Totale ultima settimana
  const oggi = new Date();
  const unaSettimanaFa = new Date(oggi);
  unaSettimanaFa.setDate(oggi.getDate() - 7);

  const speseSettimana = spese.filter(s => new Date(s.data) >= unaSettimanaFa);
  const totaleSettimana = speseSettimana.reduce((sum, s) => sum + s.prezzo, 0);
  document.getElementById("totaleSettimana").textContent = totaleSettimana.toFixed(2) + "€";

  // Spesa max e min (pesata per numero prodotti)
  if (spese.length > 0) {
    let spesaMax = Math.max(...spese.map(s => s.prezzo));
    let spesaMin = Math.min(...spese.map(s => s.prezzo));
    document.getElementById("spesaMax").textContent = spesaMax.toFixed(2) + "€";
    document.getElementById("spesaMin").textContent = spesaMin.toFixed(2) + "€";
  }

  // Grafico andamento (ultimi 7 giorni)
  const spesePerGiorno = {};
  speseSettimana.forEach(s => {
    const giorno = new Date(s.data).toLocaleDateString('it-IT');
    spesePerGiorno[giorno] = (spesePerGiorno[giorno] || 0) + s.prezzo;
  });

  new Chart(document.getElementById("graficoAndamento"), {
    type: 'bar',
    data: {
      labels: Object.keys(spesePerGiorno),
      datasets: [{
        label: '€ spesi',
        data: Object.values(spesePerGiorno),
        backgroundColor: '#3498db'
      }]
    }
  });

  // Grafico a torta supermercati
  const perSupermercato = {};
  spese.forEach(s => {
    perSupermercato[s.supermercato] = (perSupermercato[s.supermercato] || 0) + s.prezzo;
  });

  new Chart(document.getElementById("graficoSupermercati"), {
    type: 'pie',
    data: {
      labels: Object.keys(perSupermercato),
      datasets: [{
        data: Object.values(perSupermercato),
        backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#34495e']
      }]
    }
  });

  // Grafico a torta tipologia prodotto
  const perTipologia = {};
  spese.forEach(s => {
    perTipologia[s.tipologia] = (perTipologia[s.tipologia] || 0) + s.prezzo;
  });

  new Chart(document.getElementById("graficoTipologia"), {
    type: 'pie',
    data: {
      labels: Object.keys(perTipologia),
      datasets: [{
        data: Object.values(perTipologia),
        backgroundColor: ['#1abc9c', '#e67e22', '#9b59b6', '#f39c12', '#2980b9', '#c0392b']
      }]
    }
  });
});