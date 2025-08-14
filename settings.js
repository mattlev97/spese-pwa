/* settings.js - logica per impostazioni (usa l'istanza globale `app`) */

(function () {
  if (typeof app === 'undefined') {
    console.error('settings.js necessita di app.js caricato prima');
    return;
  }

  const container = document.getElementById('storesContainer');
  const newStoreInput = document.getElementById('newStoreInput');
  const addStoreBtn = document.getElementById('addStoreBtn');
  const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  function renderStoresList() {
    if (!container) return;
    container.innerHTML = '';
    const stores = app.getStores() || [];
    if (!stores.length) {
      container.innerHTML = '<div class="no-expenses">Nessun supermercato salvato</div>';
      return;
    }

    stores.forEach(name => {
      const item = document.createElement('div');
      item.className = 'store-item';
      item.dataset.store = name;

      const handle = document.createElement('div');
      handle.className = 'store-handle';
      handle.title = 'Trascina per riordinare (non implementato)';
      handle.textContent = '≡';

      const input = document.createElement('input');
      input.className = 'store-input';
      input.value = name;
      input.readOnly = true;

      const actions = document.createElement('div');
      actions.className = 'store-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-secondary';
      editBtn.title = 'Rinomina';
      editBtn.innerHTML = '✏️';
      editBtn.addEventListener('click', () => {
        const newName = prompt('Nuovo nome supermercato:', name);
        if (!newName) return;
        const ok = app.editStore(name, newName.trim());
        if (!ok) alert('Rinomina fallita (nome duplicato o non valido).');
        renderStoresList();
      });

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.title = 'Rimuovi';
      removeBtn.innerHTML = '🗑️';
      removeBtn.addEventListener('click', () => {
        if (!confirm(`Eliminare "${name}" dalla lista dei supermercati?`)) return;
        app.removeStore(name);
        renderStoresList();
        app.populateAllStoreSelects();
      });

      actions.appendChild(editBtn);
      actions.appendChild(removeBtn);

      item.appendChild(handle);
      item.appendChild(input);
      item.appendChild(actions);

      container.appendChild(item);
    });
  }

  function addStoreFromInput() {
    const val = newStoreInput ? newStoreInput.value.trim() : '';
    if (!val) { alert('Inserisci il nome del supermercato'); return; }
    const ok = app.addStore(val);
    if (!ok) { alert('Questo supermercato è già presente o non valido.'); return; }
    if (newStoreInput) newStoreInput.value = '';
    renderStoresList();
    app.populateAllStoreSelects();
  }

  function resetDefaults() {
    if (!confirm('Ripristinare la lista ai valori predefiniti?')) return;
    app.saveStores(app.defaultStores.slice());
    renderStoresList();
    app.populateAllStoreSelects();
    alert('Valori predefiniti ripristinati.');
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderStoresList();

    if (addStoreBtn) addStoreBtn.addEventListener('click', addStoreFromInput);
    if (newStoreInput) newStoreInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addStoreFromInput(); } });

    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        app.saveStores(app.getStores());
        alert('Impostazioni salvate.');
      });
    }

    if (resetDefaultsBtn) {
      resetDefaultsBtn.addEventListener('click', resetDefaults);
    }

    // react to external changes (other tabs)
    document.addEventListener('app:stores-changed', () => {
      renderStoresList();
    });
  });

})();