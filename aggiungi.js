document.addEventListener("DOMContentLoaded", () => {
  const formSpesa = document.getElementById("formSpesa");
  const tabellaCarrelloBody = document.querySelector("#tabellaCarrello tbody");
  const supermercatoSelect = document.getElementById("supermercato");

  const totaleSpesaEl = document.createElement("div");
  totaleSpesaEl.style.fontWeight = "bold";
  totaleSpesaEl.style.marginTop = "10px";
  document.getElementById("tabellaCarrello").after(totaleSpesaEl);

  let carrello = [];

  // Mostra/Nascondi aggiungi supermercato
  document.getElementById("aggiungiSupermercatoBtn").addEventListener("click", () => {
    const div = document.getElementById("aggiungiSupermercatoDiv");
    div.style.display = div.style.display === "none" ? "block" : "none";
  });

  // Salva nuovo supermercato
  document.getElementById("salvaSupermercatoBtn").addEventListener("click", () => {
    const nuovoNome = document.getElementById("nuovoSupermercato").value.trim();
    if (nuovoNome === "") {
      alert("Inserisci un nome valido per il supermercato.");
      return;
    }
    // Evita duplicati
    for (let i = 0; i < supermercatoSelect.options.length; i++) {
      if (supermercatoSelect.options[i].value.toLowerCase() === nuovoNome.toLowerCase()) {
        alert("Supermercato già presente.");
        return;
      }
    }
    const option = document.createElement("option");
    option.textContent = nuovoNome;
    option.value = nuovoNome;
    supermercatoSelect.appendChild(option);
    supermercatoSelect.value = nuovoNome;

    document.getElementById("nuovoSupermercato").value = "";
    document.getElementById("aggiungiSupermercatoDiv").style.display = "none";
  });

  // Aggiungi prodotto al carrello
  document.getElementById("aggiungiProdottoBtn").addEventListener("click", () => {
    const tipologia = document.getElementById("tipologia").value;
    const nome = document.getElementById("nome").value.trim();
    const prezzo = parseFloat(document.getElementById("prezzo").value);
    const prezzoKgRaw = document.getElementById("prezzoKg").value;
    const prezzoKg = prezzoKgRaw ? parseFloat(prezzoKgRaw) : null;
    const note = document.getElementById("note").value.trim();

    if (!tipologia || !nome || isNaN(prezzo)) {
      alert("Completa i campi Tipologia, Nome e Prezzo prima di aggiungere il prodotto.");
      return;
    }

    const prodotto = { tipologia, nome, prezzo, prezzoKg, note };
    carrello.push(prodotto);

    aggiornaTabellaCarrello();

    // Reset campi prodotto
    document.getElementById("tipologia").value = "";
    document.getElementById("nome").value = "";
    document.getElementById("prezzo").value = "";
    document.getElementById("prezzoKg").value = "";
    document.getElementById("note").value = "";
  });

  // Aggiorna tabella carrello e totale
  function aggiornaTabellaCarrello() {
    tabellaCarrelloBody.innerHTML = "";

    carrello.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.tipologia}</td>
        <td>${p.nome}</td>
        <td>${p.prezzo.toFixed(2)}</td>
        <td>${p.prezzoKg !== null ? p.prezzoKg.toFixed(2) : ""}</td>
        <td>${p.note}</td>
        <td><button data-index="${i}" class="rimuoviBtn">❌</button></td>
      `;
      tabellaCarrelloBody.appendChild(tr);
    });

    // Aggiorna totale
    const totale = carrello.reduce((sum, p) => sum + p.prezzo, 0);
    totaleSpesaEl.textContent = `Totale spesa: € ${totale.toFixed(2)}`;

    // Eventi rimozione prodotto
    document.querySelectorAll(".rimuoviBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.getAttribute("data-index"));
        carrello.splice(index, 1);
        aggiornaTabellaCarrello();
      });
    });
  }

  // Salva spesa completa
  formSpesa.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!supermercatoSelect.value) {
      alert("Seleziona un supermercato.");
      return;
    }
    if (carrello.length === 0) {
      alert("Aggiungi almeno un prodotto al carrello prima di salvare la spesa.");
      return;
    }

    const nuovaSpesa = {
      data: new Date().toISOString(),
      supermercato: supermercatoSelect.value,
      prodotti: carrello
    };

    // Salva su "spese" (per dashboard)
    let spese = JSON.parse(localStorage.getItem("spese")) || [];
    spese.push(nuovaSpesa);
    localStorage.setItem("spese", JSON.stringify(spese));

    // Salva anche su "archivio"
    let archivio = JSON.parse(localStorage.getItem("archivio")) || [];
    archivio.push(nuovaSpesa);
    localStorage.setItem("archivio", JSON.stringify(archivio));

    alert("Spesa salvata con successo!");
    window.location.href = "index.html";
  });
});