function caricaArchivio() {
  const spese = JSON.parse(localStorage.getItem("spese")) || [];
  const lista = document.getElementById("listaSpese");

  if (spese.length === 0) {
    lista.innerHTML = "<p>Nessuna spesa registrata.</p>";
    return;
  }

  lista.innerHTML = spese.map((s, i) =>
    `<div>
      ${new Date(s.data).toLocaleDateString()} - 
      <strong>${s.nome}</strong> (${s.tipologia}) - 
      €${s.prezzo.toFixed(2)} @ ${s.supermercato}
      <button onclick="rimuoviSpesa(${i})">Rimuovi</button>
    </div>`
  ).join("");
}

function rimuoviSpesa(index) {
  const spese = JSON.parse(localStorage.getItem("spese")) || [];
  spese.splice(index, 1);
  localStorage.setItem("spese", JSON.stringify(spese));
  caricaArchivio();
}

caricaArchivio();