let archivio = JSON.parse(localStorage.getItem("archivio")) || [];
const tbody = document.getElementById("archivioTableBody");
const modal = document.getElementById("modalDettagli");
const closeModal = document.querySelector(".close");
const modalTableBody = document.getElementById("modalTableBody");
const totaleModal = document.getElementById("totaleModal");

function mostraArchivio(filtri = {}) {
    tbody.innerHTML = "";

    let elenco = [...archivio];

    // Filtri
    if (filtri.data) {
        elenco = elenco.filter(s => s.data.startsWith(filtri.data));
    }
    if (filtri.supermercato) {
        elenco = elenco.filter(s =>
            s.supermercato.toLowerCase().includes(filtri.supermercato.toLowerCase())
        );
    }

    elenco.forEach((spesa, index) => {
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

    document.querySelectorAll(".dettagliBtn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = e.target.getAttribute("data-index");
            mostraDettagli(idx);
        });
    });

    document.querySelectorAll(".rimuoviBtn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = e.target.getAttribute("data-index");
            if (confirm("Vuoi davvero rimuovere questa spesa?")) {
                archivio.splice(idx, 1);
                localStorage.setItem("archivio", JSON.stringify(archivio));
                mostraArchivio(filtri);
            }
        });
    });
}

function mostraDettagli(index) {
    const spesa = archivio[index];
    modalTableBody.innerHTML = "";

    let totale = 0;

    spesa.prodotti.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${p.tipologia}</td>
            <td>${p.nome}</td>
            <td>${p.prezzo.toFixed(2)}</td>
            <td>${p.prezzoKg ? p.prezzoKg.toFixed(2) : "-"}</td>
            <td>${p.note || ""}</td>
        `;
        totale += p.prezzo;
        modalTableBody.appendChild(tr);
    });

    totaleModal.textContent = `Totale spesa: € ${totale.toFixed(2)}`;
    modal.style.display = "block";
}

closeModal.addEventListener("click", () => {
    modal.style.display = "none";
});
window.addEventListener("click", (event) => {
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

// Eventi filtro
document.getElementById("btnFiltra").addEventListener("click", () => {
    const data = document.getElementById("filtroData").value;
    const supermercato = document.getElementById("filtroSupermercato").value;
    mostraArchivio({ data, supermercato });
});

document.getElementById("btnReset").addEventListener("click", () => {
    document.getElementById("filtroData").value = "";
    document.getElementById("filtroSupermercato").value = "";
    mostraArchivio();
});

mostraArchivio();