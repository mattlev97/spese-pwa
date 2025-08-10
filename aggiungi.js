let carrello = [];

document.getElementById("aggiungiProdotto").addEventListener("click", () => {
    const tipologia = document.getElementById("tipologia").value;
    const nome = document.getElementById("nome").value;
    const prezzo = parseFloat(document.getElementById("prezzo").value) || 0;
    const prezzoKg = parseFloat(document.getElementById("prezzoKg").value) || 0;
    const note = document.getElementById("note").value;

    if (!tipologia || !nome) {
        alert("Inserisci almeno tipologia e nome prodotto");
        return;
    }

    carrello.push({ tipologia, nome, prezzo, prezzoKg, note });
    aggiornaCarrello();

    document.getElementById("tipologia").value = "";
    document.getElementById("nome").value = "";
    document.getElementById("prezzo").value = "";
    document.getElementById("prezzoKg").value = "";
    document.getElementById("note").value = "";
});

function aggiornaCarrello() {
    const tbody = document.querySelector("#carrello tbody");
    tbody.innerHTML = "";
    let totale = 0;

    carrello.forEach((p, index) => {
        totale += p.prezzo;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.tipologia}</td>
            <td>${p.nome}</td>
            <td>€${p.prezzo.toFixed(2)}</td>
            <td>${p.prezzoKg ? "€" + p.prezzoKg.toFixed(2) : "-"}</td>
            <td>${p.note || "-"}</td>
            <td><button onclick="rimuoviProdotto(${index})">❌</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("totaleCarrello").textContent = `Totale: €${totale.toFixed(2)}`;
}

function rimuoviProdotto(index) {
    carrello.splice(index, 1);
    aggiornaCarrello();
}

document.getElementById("salvaSpesa").addEventListener("click", () => {
    const supermercato = document.getElementById("supermercato").value;
    if (!supermercato) {
        alert("Seleziona un supermercato");
        return;
    }
    if (carrello.length === 0) {
        alert("Aggiungi almeno un prodotto al carrello");
        return;
    }

    const spese = JSON.parse(localStorage.getItem("spese")) || [];
    spese.push({
        supermercato,
        prodotti: carrello,
        data: new Date().toISOString()
    });
    localStorage.setItem("spese", JSON.stringify(spese));

    alert("Spesa salvata con successo!");
    window.location.href = "index.html";
});