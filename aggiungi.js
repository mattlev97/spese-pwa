const form = document.getElementById("spesaForm");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const nuovaSpesa = {
    supermercato: document.getElementById("supermercato").value,
    tipologia: document.getElementById("tipologia").value,
    nome: document.getElementById("nome").value,
    prezzo: parseFloat(document.getElementById("prezzo").value),
    prezzoKg: parseFloat(document.getElementById("prezzoKg").value) || null,
    note: document.getElementById("note").value,
    data: new Date().toISOString()
  };

  const spese = JSON.parse(localStorage.getItem("spese")) || [];
  spese.push(nuovaSpesa);
  localStorage.setItem("spese", JSON.stringify(spese));

  alert("Spesa salvata!");
  form.reset();
});