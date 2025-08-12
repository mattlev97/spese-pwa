/* settings.js - logica per impostazioni (usa l'istanza globale `app`) */

(function(){
  if (typeof app === 'undefined') {
    console.error('settings.js necessita di app.js caricato prima');
    return;
  }

  // elementi
  const storesListEl = document.getElementById('storesList');
  const newStoreInput = document.getElementById('newStoreInput');
  const addStoreBtn = document.getElementById('addStoreBtn');
  const resetDataBtn = document.getElementById('resetDataBtn');
  const resetStoresBtn = document.getElementById('resetStoresBtn');
  const themeToggle = document.getElementById('themeToggle');

  // render lista supermercati nella pagina impostazioni
  function renderStores() {
    if (!storesListEl) return;
    const stores = app.getStores() || [];
    storesListEl.innerHTML = '';
    if (stores.length === 0) {
      storesListEl.innerHTML = '<div style="color:#aaa">Nessun supermercato</div>';
      return;
    }
    stores.forEach(s => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.gap = '8px';
      row.style.marginBottom = '8px';

      const name = document.createElement('div');
      name.textContent = s;
      name.style.flex = '1';
      name.style.color = '#fff';

      const group = document.createElement('div');
      group.style.display = 'flex';
      group.style.gap = '8px';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-secondary';
      editBtn.style.minWidth = '44px';
      editBtn.textContent = '✏️';
      editBtn.title = 'Modifica';
      editBtn.addEventListener('click', () => editStorePrompt(s));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger';
      delBtn.style.minWidth = '44px';
      delBtn.textContent = '🗑️';
      delBtn.title = 'Elimina';
      delBtn.addEventListener('click', () => {
        if (confirm(`Eliminare "${s}"?`)) {
          app.removeStore(s);
          renderStores();
          try { populateStoreSelect('storeSelect'); populateStoreFilter(); } catch(e){}
        }
      });

      group.appendChild(editBtn);
      group.appendChild(delBtn);
      row.appendChild(name);
      row.appendChild(group);
      storesListEl.appendChild(row);
    });
  }

  function editStorePrompt(oldName) {
    const newName = prompt('Nuovo nome supermercato:', oldName);
    if (!newName) return;
    const ok = app.editStore(oldName, newName.trim());
    if (!ok) alert('Rinomina fallita (nome duplicato o non valido).');
    renderStores();
    try { populateStoreSelect('storeSelect'); populateStoreFilter(); } catch(e){}
  }

  function addStoreFromInput() {
    const val = newStoreInput ? newStoreInput.value.trim() : '';
    if (!val) { alert('Inserisci un nome valido'); return; }
    const ok = app.addStore(val);
    if (!ok) { alert('Nome già presente o non valido'); return; }
    if (newStoreInput) newStoreInput.value = '';
    renderStores();
    try { populateStoreSelect('storeSelect'); populateStoreFilter(); } catch(e){}
  }

  function resetAllData() {
    if (!confirm('Eliminare tutte le spese? Operazione irreversibile.')) return;
    app.clearExpenses();
    alert('Spese eliminate');
    try { loadDashboard(); loadExpensesList(); } catch(e){}
  }

  function resetStores() {
    if (!confirm('Ripristinare supermercati predefiniti?')) return;
    localStorage.removeItem(app.storesKey);
    app.ensureDefaultStores();
    renderStores();
    try { populateStoreSelect('storeSelect'); populateStoreFilter(); } catch(e){}
  }

  // tema (salvato in localStorage 'theme' = 'dark'|'light')
  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    }
  }

  // init
  document.addEventListener('DOMContentLoaded', () => {
    renderStores();
    if (addStoreBtn) addStoreBtn.addEventListener('click', addStoreFromInput);
    if (newStoreInput) newStoreInput.addEventListener('keydown', (e)=> { if (e.key === 'Enter') addStoreFromInput(); });

    if (resetDataBtn) resetDataBtn.addEventListener('click', resetAllData);
    if (resetStoresBtn) resetStoresBtn.addEventListener('click', resetStores);

    // theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (themeToggle) themeToggle.checked = (savedTheme === 'light');
    applyTheme(savedTheme);
    if (themeToggle) themeToggle.addEventListener('change', ()=> applyTheme(themeToggle.checked ? 'light' : 'dark'));
  });

  // Expose render function for storage listener
  window.renderSettingsStores = renderStores;

})();
