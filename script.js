// script.js
let spese = JSON.parse(localStorage.getItem('spese')) || [];
let carrello = [];

// Funzioni comuni
function salvaDati() {
    localStorage.setItem('spese', JSON.stringify(spese));
}

function getDataInizio(periodo) {
    const oggi = new Date();
    if (periodo === 'settimana') {
        oggi.setDate(oggi.getDate() - 7);
    } else if (periodo === 'mese') {
        oggi.setMonth(oggi.getMonth() - 1);
    } else if (periodo === 'anno') {
        oggi.setFullYear(oggi.getFullYear() - 1);
    }
    return oggi;
}

function filtraSpesePeriodo(spese, periodo) {
    if (!periodo) return spese;
    const inizio = getDataInizio(periodo);
    return spese.filter(spesa => new Date(spesa.data) >= inizio);
}

// Dashboard
function aggiornaStatistiche() {
    const periodo = document.getElementById('periodo').value;
    let speseFiltrate = filtraSpesePeriodo(spese, periodo);

    let totale = 0;
    let max = 0;
    let min = Infinity;
    let supermercati = {};
    let tipologie = {};

    speseFiltrate.forEach(spesa => {
        totale += spesa.totale;
        if (spesa.totale > max) max = spesa.totale;
        if (spesa.totale < min) min = spesa.totale;
        supermercati[spesa.supermercato] = (supermercati[spesa.supermercato] || 0) + 1;
        spesa.prodotti.forEach(prod => {
            tipologie[prod.tipologia] = (tipologie[prod.tipologia] || 0) + 1;
        });
    });

    document.getElementById('totale').textContent = totale.toFixed(2) + ' €';
    document.getElementById('max').textContent = (max || 0).toFixed(2) + ' €';
    document.getElementById('min').textContent = (min === Infinity ? 0 : min).toFixed(2) + ' €';

    // Grafico supermercati
    const ctxSup = document.getElementById('graficoSupermercati').getContext('2d');
    new Chart(ctxSup, {
        type: 'pie',
        data: {
            labels: Object.keys(supermercati),
            datasets: [{ data: Object.values(supermercati), backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'] }]
        }
    });

    // Grafico tipologie
    const ctxTip = document.getElementById('graficoTipologie').getContext('2d');
    new Chart(ctxTip, {
        type: 'pie',
        data: {
            labels: Object.keys(tipologie),
            datasets: [{ data: Object.values(tipologie), backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'] }]
        }
    });
}

// Aggiungi spesa
function aggiungiProdottoAlCarrello() {
    const tipologia = document.getElementById('tipologia').value;
    const nome = document.getElementById('nome').value;
    const prezzo = parseFloat(document.getElementById('prezzo').value) || 0;
    const prezzoKg = parseFloat(document.getElementById('prezzoKg').value) || 0;
    const note = document.getElementById('note').value;

    if (!nome) return alert('Inserisci nome prodotto');

    carrello.push({ tipologia, nome, prezzo, prezzoKg, note });

    aggiornaTabellaCarrello();
    document.getElementById('formSpesa').reset();
}

function aggiornaTabellaCarrello() {
    const tbody = document.getElementById('tabellaCarrello').querySelector('tbody');
    tbody.innerHTML = '';
    let totale = 0;
    carrello.forEach((prod, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${prod.tipologia}</td>
            <td>${prod.nome}</td>
            <td>${prod.prezzo.toFixed(2)} €</td>
            <td>${prod.prezzoKg.toFixed(2)} €</td>
            <td>${prod.note}</td>
            <td><button class="secondary" onclick="rimuoviProdotto(${index})">Rimuovi</button></td>
        `;
        tbody.appendChild(tr);
        totale += prod.prezzo;
    });
    document.getElementById('totaleCarrello').textContent = totale.toFixed(2) + ' €';
}

function rimuoviProdotto(index) {
    carrello.splice(index, 1);
    aggiornaTabellaCarrello();
}

function salvaSpesa() {
    let supermercato = document.getElementById('supermercato').value;
    if (supermercato === 'Altro') {
        supermercato = document.getElementById('nuovoSupermercato').value;
        if (!supermercato) return alert('Inserisci nome supermercato');
    }
    if (carrello.length === 0) return alert('Aggiungi almeno un prodotto');

    const totale = carrello.reduce((sum, prod) => sum + prod.prezzo, 0);
    const data = new Date().toISOString().split('T')[0];

    spese.push({ data, supermercato, prodotti: [...carrello], totale });
    salvaDati();
    carrello = [];
    aggiornaTabellaCarrello();
    alert('Spesa salvata!');
    window.location.href = 'index.html';
}

// Archivio
function filtraSpese() {
    const periodo = document.getElementById('filtroPeriodo').value;
    const supFiltro = document.getElementById('filtroSupermercato').value.toLowerCase();
    const tipFiltro = document.getElementById('filtroTipologia').value.toLowerCase();

    let speseFiltrate = filtraSpesePeriodo(spese, periodo);
    speseFiltrate = speseFiltrate.filter(spesa => {
        if (supFiltro && !spesa.supermercato.toLowerCase().includes(supFiltro)) return false;
        if (tipFiltro) {
            return spesa.prodotti.some(prod => prod.tipologia.toLowerCase().includes(tipFiltro));
        }
        return true;
    });

    const lista = document.getElementById('listaSpese');
    lista.innerHTML = '';
    speseFiltrate.forEach((spesa, index) => {
        const div = document.createElement('div');
        div.innerHTML = `
            <p>Data: ${spesa.data}</p>
            <p>Supermercato: ${spesa.supermercato}</p>
            <p>Totale: ${spesa.totale.toFixed(2)} €</p>
            <table>
                <thead><tr><th>Tipologia</th><th>Nome</th><th>Prezzo</th><th>Prezzo/kg</th><th>Note</th></tr></thead>
                <tbody>${spesa.prodotti.map(prod => `<tr><td>${prod.tipologia}</td><td>${prod.nome}</td><td>${prod.prezzo.toFixed(2)}</td><td>${prod.prezzoKg.toFixed(2)}</td><td>${prod.note}</td></tr>`).join('')}</tbody>
            </table>
            <button class="secondary" onclick="eliminaSpesa(${index})">Elimina</button>
        `;
        lista.appendChild(div);
    });
}

function eliminaSpesa(index) {
    if (confirm('Confermi eliminazione?')) {
        spese.splice(index, 1);
        salvaDati();
        filtraSpese();
    }
}

// Registrazione Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}
