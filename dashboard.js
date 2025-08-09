document.addEventListener("DOMContentLoaded", () => {
  const spese = JSON.parse(localStorage.getItem("spese")) || [];

  const oggi = new Date();
  const unaSettimanaFa = new Date(oggi);
  unaSettimanaFa.setDate(oggi.getDate() - 6);

  // Funzione helper per sommare prezzi prodotti in una spesa
  function totaleSpesaProdotti(spesa) {
    return spesa.prodotti.reduce((sum, p) => sum + p.prezzo, 0);
  }

  // Filtra spese ultimi 7 giorni
  const speseSettimana = spese.filter(s => {
    const dataSpesa = new Date(s.data);
    return dataSpesa >= unaSettimanaFa && dataSpesa <= oggi;
  });

  // Totale settimana
  const totaleSettimana = speseSettimana.reduce((sum, s) => sum + totaleSpesaProdotti(s), 0);
  document.getElementById("totaleSettimana").textContent = totaleSettimana.toFixed(2) + "€";

  // Spesa max e min (basata su totale prodotti per spesa)
  if (spese.length > 0) {
    const totali = spese.map(s => totaleSpesaProdotti(s));
    const spesaMax = Math.max(...totali);
    const spesaMin = Math.min(...totali);
    document.getElementById("spesaMax").textContent = spesaMax.toFixed(2) + "€";
    document.getElementById("spesaMin").textContent = spesaMin.toFixed(2) + "€";
  }

  // Grafico andamento (ultimi 7 giorni)
  const spesePerGiorno = {};
  for (let i = 0; i < 7; i++) {
    const giorno = new Date(unaSettimanaFa);
    giorno.setDate(unaSettimanaFa.getDate() + i);
    const key = giorno.toLocaleDateString('it-IT');
    spesePerGiorno[key] = 0;
  }
  speseSettimana.forEach(s => {
    const giorno = new Date(s.data).toLocaleDateString('it-IT');
    spesePerGiorno[giorno] += totaleSpesaProdotti(s);
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
    },
    options: { scales: { y: { beginAtZero: true } } }
  });

  // Grafico supermercati
  const perSupermercato = {};
  spese.forEach(s => {
    if (s.supermercato) {
      perSupermercato[s.supermercato] = (perSupermercato[s.supermercato] || 0) + totaleSpesaProdotti(s);
    }
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

  // Grafico tipologia (somma prezzi di prodotti per tipologia)
  const perTipologia = {};
  spese.forEach(s => {
    s.prodotti.forEach(p => {
      if (p.tipologia) {
        perTipologia[p.tipologia] = (perTipologia[p.tipologia] || 0) + p.prezzo;
      }
    });
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