function caricaDashboard() {
    const spese = JSON.parse(localStorage.getItem("spese")) || [];
    const container = document.getElementById("dashboard");

    if (spese.length === 0) {
        container.innerHTML = "<p>Nessuna spesa registrata</p>";
        return;
    }

    let totaleSettimana = 0;
    const oggi = new Date();
    spese.forEach(spesa => {
        const dataSpesa = new Date(spesa.data);
        const diffGiorni = (oggi - dataSpesa) / (1000 * 60 * 60 * 24);
        if (diffGiorni <= 7) {
            totaleSettimana += spesa.prodotti.reduce((sum, p) => sum + p.prezzo, 0);
        }
    });

    container.innerHTML = `
        <h2>Totale ultima settimana: €${totaleSettimana.toFixed(2)}</h2>
    `;
}

caricaDashboard();