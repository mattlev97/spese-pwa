document.addEventListener("DOMContentLoaded", () => {
  let archivio = JSON.parse(localStorage.getItem("archivio")) || [];
  const tbody = document.getElementById("archivioTableBody");
  const modal = document.getElementById("modalDettagli");
  const closeModal = document.querySelector(".close");
  const modalTableBody = document.getElementById("modalTableBody");
  const totaleModal = document.getElementById("totaleModal");

  function mostraArchivio(filtri = {}) {
    tbody.innerHTML = "";
    let elenco = [...archivio];

    if (filtri.data) {
      elenco = elenco.filter(s => s.data.startsWith(filtri.data));
    }
    if (filtri.supermercato) {
      elenco = elenco.filter(s => s.supermercato.toLowerCase().includes(filtri.supermercato.toLowerCase()));
    }

    elenco.forEach((spesa, idx) => {
      const totale = (spesa.prodotti || []).reduce((a,b) => a + (Number(b.prezzo)||0), 0);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(spesa.data).toLocaleDateString()}</td>
        <td>${spesa.supermercato}</td>
        <td>${totale.toFixed(2)}</td>
        <td><button class="dettagliBtn" data-idx="${idx}">👁️</button></td>
        <td><button class="rimuoviBtn" data-idx="${idx}">❌</button></td>
      `;
      tbody.appendChild(tr);
    });

    // eventi
    document.querySelectorAll(".dettagliBtn").forEach(b => {
      b.addEventListener("click", (e) => {
        const i = Number(e.currentTarget.getAttribute("data-idx"));
        mostraDettagli(i);
      });
    });
    document.querySelectorAll(".rimuoviBtn").forEach(b => {
      b.addEventListener("click", (e) => {
        const i = Number(e.currentTarget.getAttribute("data-idx"));
        if (!confirm("Rimuovere questa spesa?")) return;
        archivio.splice(i,1);
        localStorage.setItem("archivio", JSON.stringify(archivio));
        mostraArchivio(filtri);
      });
    });
  }

  function mostraDettagli(index) {
    const spesa = archivio[index];
    modalTableBody.innerHTML = "";
    let totale = 0;
    (spesa.prodotti || []).forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.tipologia}</td>
        <td>${p.nome}</td>
        <td>${Number(p.prezzo).toFixed(2)}</td>
        <td>${p.prezzoKg !== null ? Number(p.prezzoKg).toFixed(2) : '-'}</td>
        <td>${p.note || ''}</td>
      `;
      totale += Number(p.prezzo) || 0;
      modalTableBody.appendChild(tr);
    });
    totaleModal.textContent = `Totale spesa: € ${totale.toFixed(2)}`;
    modal.style.display = "block";
  }

  // chiusura modale
  closeModal.addEventListener("click", ()=> modal.style.display = "none");
  window.addEventListener("click", (ev)=> { if (ev.target === modal) modal.style.display = "none"; });

  // filtri
  document.getElementById("btnFiltra").addEventListener("click", () => {
    const data = document.getElementById("filtroData").value;
    const sup = document.getElementById("filtroSupermercato").value;
    mostraArchivio({ data, supermercato: sup });
  });
  document.getElementById("btnReset").addEventListener("click", () => {
    document.getElementById("filtroData").value = "";
    document.getElementById("filtroSupermercato").value = "";
    mostraArchivio();
  });

  mostraArchivio();
});