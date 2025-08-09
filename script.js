const form = document.getElementById("spesaForm");
const archivioDiv = document.getElementById("archivio");

function caricaSpese() {
  const spese = JSON.parse(localStorage.getItem("spese")) || [];
  archivioDiv.innerHTML = "";

  if (spese.length === 0) {
    archivioDiv.innerHTML = "<p>Nessuna spesa registrata.</p>";
    return;
  }

  spese.forEach((spesa, index) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${spesa.supermercato}</strong> - ${spesa.tipologia} - ${spesa.nome} - €${spesa.prezzo}
      <button onclick="rimuoviSpesa(${index})">Rimuovi</button>
    `;
    archivioDiv.appendChild(div);
  });
}

function rimuoviSpesa(index) {
  const spese = JSON.parse(localStorage.getItem("spese")) || [];
  spese.splice(index, 1);
  localStorage.setItem("spese", JSON.stringify(spese));
  caricaSpese();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const nuovaSpesa = {
    supermercato: document.getElementById("supermercato").value,
    tipologia: document.getElementById("tipologia").value,
    nome: document.getElementById("nome").value,
    prezzo: parseFloat(document.getElementById("prezzo").value),
    prezzoKg: parseFloat(document.getElementById("prezzoKg").value) || null,
    note: document.getElementById("note").value
  };

  const spese = JSON.parse(localStorage.getItem("spese")) || [];
  spese.push(nuovaSpesa);
  localStorage.setItem("spese", JSON.stringify(spese));

  form.reset();
  caricaSpese();
});

caricaSpese();