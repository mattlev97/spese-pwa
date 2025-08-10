document.addEventListener("DOMContentLoaded", () => {
  const supermercatoSelect = document.getElementById("supermercato");
  const aggiungiSupermercatoBtn = document.getElementById("aggiungiSupermercatoBtn");
  const aggiungiSupermercatoDiv = document.getElementById("aggiungiSupermercatoDiv");
  const salvaSupermercatoBtn = document.getElementById("salvaSupermercatoBtn");
  const nuovoSupermercatoInput = document.getElementById("nuovoSupermercato");

  const tabellaCarrelloBody = document.querySelector("#tabellaCarrello tbody");
  const totaleSpesaEl = document.getElementById("totaleSpesaEl");
  let carrello = [];

  // toggle campo aggiungi supermercato
  aggiungiSupermercatoBtn.addEventListener("click", () => {
    aggiungiSupermercatoDiv.classList.toggle("hidden");
  });

  salvaSupermercatoBtn.addEventListener("click", () => {
    const nome = nuovoSupermercatoInput.value.trim();
    if (!nome) return alert("Inserisci nome supermercato");
    // evita duplicati (case-insensitive)
    for (let i=0;i<supermercatoSelect.options.length;i++){
      if (supermercatoSelect.options[i].value.toLowerCase() === nome.toLowerCase()) {
        return alert("Supermercato già presente");
      }
    }
    const opt = document.createElement("option");
    opt.value = nome; opt.textContent = nome;
    supermercatoSelect.appendChild(opt);
    supermercatoSelect.value = nome;
    nuovoSupermercatoInput.value = "";
    aggiungiSupermercatoDiv.classList.add("hidden");
  });

  // aggiungi prodotto al carrello
  document.getElementById("aggiungiProdottoBtn").addEventListener("click", (e) => {
    e.preventDefault();
    const tipologia = document.getElementById("tipologia").value;
    const nome = document.getElementById("nome").value.trim();
    const prezzo = parseFloat(document.getElementById("prezzo").value);
    const prezzoKgRaw = document.getElementById("prezzoKg").value;
    const prezzoKg = prezzoKgRaw ? parseFloat(prezzoKgRaw) : null;
    const note = document.getElementById("note").value.trim();

    if (!tipologia || !nome || isNaN(prezzo)) {
      return alert("Compila Tipologia, Nome e Prezzo prima di aggiungere il prodotto.");
    }

    carrello.push({ tipologia, nome, prezzo, prezzoKg, note });
    aggiornaTabellaCarrello();

    // reset campi prodotto
    document.getElementById("tipologia").value = "";
    document.getElementById("nome").value = "";
    document.getElementById("prezzo").value = "";
    document.getElementById("prezzoKg").value = "";
    document.getElementById("note").value = "";
  });

  function aggiornaTabellaCarrello() {
    tabellaCarrelloBody.innerHTML = "";
    carrello.forEach((p, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.tipologia}</td>
        <td>${p.nome}</td>
        <td>${Number(p.prezzo).toFixed(2)}</td>
        <td>${p.prezzoKg !== null ? Number(p.prezzoKg).toFixed(2) : "-"}</td>
        <td>${p.note || ""}</td>
        <td><button class="rimuoviBtn" data-idx="${idx}">❌</button></td>
      `;
      tabellaCarrelloBody.appendChild(tr);
    });

    // aggancia eventi rimozione
    document.querySelectorAll(".rimuoviBtn").forEach(b => {
      b.addEventListener("click", (ev) => {
        const i = Number(ev.currentTarget.getAttribute("data-idx"));
        carrello.splice(i,1);
        aggiornaTabellaCarrello();
      });
    });

    // aggiorna totale
    const totale = carrello.reduce((s,p) => s + (Number(p.prezzo)||0), 0);
    totaleSpesaEl.textContent = `Totale spesa: € ${totale.toFixed(2)}`;
  }

  // salva spesa completa (pulisce carrello dopo salvataggio)
  document.getElementById("salvaSpesaBtn").addEventListener("click", (e) => {
    e.preventDefault();
    if (!supermercatoSelect.value) return alert("Seleziona un supermercato.");
    if (carrello.length === 0) return alert("Aggiungi almeno un prodotto al carrello.");

    const nuovaSpesa = {
      data: new Date().toISOString(),
      supermercato: supermercatoSelect.value,
      prodotti: carrello.slice()
    };

    // salva in spese e archivio
    const spese = JSON.parse(localStorage.getItem("spese")) || [];
    spese.push(nuovaSpesa);
    localStorage.setItem("spese", JSON.stringify(spese));

    const archivio = JSON.parse(localStorage.getItem("archivio")) || [];
    archivio.push(nuovaSpesa);
    localStorage.setItem("archivio", JSON.stringify(archivio));

    // reset carrello e UI
    carrello = [];
    aggiornaTabellaCarrello();
    alert("Spesa salvata con successo!");
    // torna alla dashboard
    window.location.href = "index.html";
  });

  // inizializza tabella (se carrello vuoto)
  aggiornaTabellaCarrello();
});