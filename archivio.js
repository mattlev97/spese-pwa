document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.querySelector("#tabellaArchivio tbody");
  const archivio = JSON.parse(localStorage.getItem("archivio")) || [];

  const modal = document.getElementById("modal");
  const chiudiModal = document.getElementById("chiudiModal");
  const tabellaDettagliBody = document.querySelector("#tabellaDettagli tbody");
  const totaleModal = document.getElementById("totaleModal");

  // Chiudi modale
  chiudiModal.addEventListener("click", () => {
    modal.style.display = "none";
  });
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  function mostraArchivio() {
    tbody.innerHTML = "";

    archivio.forEach((spesa, index) => {
      const totale = spesa.prodotti.reduce((sum, p) => sum + p.prezzo, 0);
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${new Date(spesa.data).toLocaleDateString()}</td>
        <td>${spesa.supermercato}</td>
        <td>${totale.toFixed(2)}</td>
        <td><button class="dettagliBtn" data-index="${index}">👁️</button></td>
        <td><button class="rimuoviBtn" data-index="${index}">❌</button></td>
      `;

      tbody.appendChild(tr);
    });

    // Eventi pulsanti dettagli
    document.querySelectorAll(".dettagliBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.getAttribute("data-index");
        mostraDettagli(idx);
      });
    });

    // Eventi pulsanti rimozione
    document.querySelectorAll(".rimuoviBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.getAttribute("data-index");
        if (confirm("Vuoi davvero rimuovere questa spesa?")) {
          archivio.splice(idx, 1);
          localStorage.setItem("archivio", JSON.stringify(archivio));
          mostraArchivio();
        }
      });
    });
  }

  function mostraDettagli(index) {
    const spesa = archivio[index];
    tabellaDettagliBody.innerHTML = "";

    spesa.prodotti.forEach(prod => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${prod.tipologia}</td>
        <td>${prod.nome}</td>
        <td>${prod.prezzo.toFixed(2)}</td>
        <td>${prod.prezzoKg !== null ? prod.prezzoKg.toFixed(2) : ""}</td>
        <td>${prod.note || ""}</td>
      `;
      tabellaDettagliBody.appendChild(tr);
    });

    const totale = spesa.prodotti.reduce((sum, p) => sum + p.prezzo, 0);
    totaleModal.textContent = `Totale spesa: € ${totale.toFixed(2)}`;

    modal.style.display = "block";
  }

  mostraArchivio();
});