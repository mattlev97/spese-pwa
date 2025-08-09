function caricaDashboard() {
  const spese = JSON.parse(localStorage.getItem("spese")) || [];

  if (spese.length === 0) {
    document.getElementById("kpi").innerHTML = "<p>Nessuna spesa registrata.</p>";
    return;
  }

  const totale = spese.reduce((sum, s) => sum + s.prezzo, 0);
  const max = Math.max(...spese.map(s => s.prezzo));
  const min = Math.min(...spese.map(s => s.prezzo));

  document.getElementById("kpi").innerHTML = `
    <p><strong>Totale speso:</strong> €${totale.toFixed(2)}</p>
    <p><strong>Spesa massima:</strong> €${max.toFixed(2)}</p>
    <p><strong>Spesa minima:</strong> €${min.toFixed(2)}</p>
  `;

  const ultime = spese.slice(-5).reverse();
  document.getElementById("ultimeSpese").innerHTML = ultime.map(s =>
    `<div>
      ${new Date(s.data).toLocaleDateString()} - 
      <strong>${s.nome}</strong> (${s.tipologia}) - 
      €${s.prezzo.toFixed(2)} @ ${s.supermercato}
    </div>`
  ).join("");
}

caricaDashboard();
