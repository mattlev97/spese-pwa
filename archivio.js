const archivio = JSON.parse(localStorage.getItem("spese")) || [];
const tbody = document.querySelector("#archivio tbody");

function mostraArchivio(filtro = "") {
    tbody.innerHTML = "";
    archivio
        .filter(spesa => {
            const testo = filtro.toLowerCase();
            return (
                spesa.supermercato.toLowerCase().includes(testo) ||
                spesa.prodotti.some(p => p.nome.toLowerCase().includes(testo))
            );
        })
        .forEach(spesa => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${new Date(spesa.data).toLocaleDateString()}</td>
                <td>${spesa.supermercato}</td>
                <td>${spesa.prodotti.map(p => `${p.nome} (€${p.prezzo.toFixed(2)})`).join(", ")}</td>
            `;
            tbody.appendChild(tr);
        });
}

document.getElementById("filtro").addEventListener("input", e => {
    mostraArchivio(e.target.value);
});

mostraArchivio();