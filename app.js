// app.js - Gestione spese (versione aggiornata con gestione supermercati)

/*
  Funzionalità aggiunte:
  - gestione lista supermercati (localStorage key: "stores")
  - populateAllStoreSelects() per aggiornare automaticamente tutti i <select class="store-select">
  - metodi getStores/addStore/removeStore/saveStores/loadStores
*/

class ExpenseTracker {
  constructor() {
    this.expenses = this.loadExpenses();
    this.currentCart = [];
    this.deleteExpenseId = null;

    // Carica lista supermercati (o inizializza con default)
    this.defaultStores = ["Conad", "Coop", "Esselunga", "Eurospin", "Carrefour", "Lidl", "MD", "Pam", "Simply", "Iper"];
    this.stores = this.loadStores();
  }

  // -------------------------
  // Expenses
  // -------------------------
  loadExpenses() {
    try {
      const stored = localStorage.getItem('expenses');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Errore parsing expenses da localStorage', e);
      return [];
    }
  }

  saveExpenses() {
    try {
      localStorage.setItem('expenses', JSON.stringify(this.expenses));
    } catch (e) {
      console.error('Errore salvataggio expenses', e);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  addExpense(store, date, products) {
    const expense = {
      id: this.generateId(),
      store,
      date,
      products: [...products],
      total: products.reduce((sum, p) => sum + parseFloat(p.price || 0), 0),
      createdAt: new Date().toISOString()
    };

    this.expenses.push(expense);
    this.saveExpenses();
    return expense;
  }

  deleteExpense(id) {
    this.expenses = this.expenses.filter(expense => expense.id !== id);
    this.saveExpenses();
  }

  filterByPeriod(period) {
    if (!period) return this.expenses.slice();
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'settimana':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'mese':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'anno':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return this.expenses.slice();
    }

    return this.expenses.filter(expense => new Date(expense.date) >= startDate);
  }

  getStats(expenses = this.expenses) {
    if (!expenses || expenses.length === 0) {
      return {
        total: 0, count: 0,
        max: { amount: 0, store: '' }, min: { amount: 0, store: '' },
        avgPerExpense: 0, storeStats: {}, categoryStats: {}
      };
    }

    const total = expenses.reduce((sum, exp) => sum + exp.total, 0);
    const amounts = expenses.map(exp => exp.total);
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);

    const maxExpense = expenses.find(exp => exp.total === maxAmount) || {};
    const minExpense = expenses.find(exp => exp.total === minAmount) || {};

    const storeStats = {};
    const categoryStats = {};

    expenses.forEach(expense => {
      // store stats
      if (!storeStats[expense.store]) storeStats[expense.store] = { count: 0, total: 0 };
      storeStats[expense.store].count++;
      storeStats[expense.store].total += expense.total;

      // category stats
      (expense.products || []).forEach(product => {
        if (!categoryStats[product.category]) categoryStats[product.category] = { count: 0, total: 0 };
        categoryStats[product.category].count++;
        categoryStats[product.category].total += parseFloat(product.price || 0);
      });
    });

    return {
      total,
      count: expenses.length,
      max: { amount: maxAmount, store: maxExpense.store || '' },
      min: { amount: minAmount, store: minExpense.store || '' },
      avgPerExpense: total / expenses.length,
      storeStats,
      categoryStats
    };
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  }

  formatDate(dateString) {
    try {
      return new Intl.DateTimeFormat('it-IT', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  }

  // -------------------------
  // Stores (supermercati) management
  // -------------------------
  loadStores() {
    try {
      const raw = localStorage.getItem('stores');
      if (!raw) {
        // salva default al primo avvio
        this.saveStores(this.defaultStores.slice());
        return this.defaultStores.slice();
      }
      const parsed = JSON.parse(raw);
      // se parsed non valido, resetta a default
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.saveStores(this.defaultStores.slice());
        return this.defaultStores.slice();
      }
      return parsed;
    } catch (e) {
      console.error('Errore loadStores', e);
      this.saveStores(this.defaultStores.slice());
      return this.defaultStores.slice();
    }
  }

  saveStores(list) {
    try {
      const toSave = Array.isArray(list) ? list : this.stores;
      localStorage.setItem('stores', JSON.stringify(toSave));
      // aggiorna istanza se passata lista
      if (Array.isArray(list)) this.stores = list.slice();
    } catch (e) {
      console.error('Errore saveStores', e);
    }
  }

  getStores() {
    // ritorna copia per sicurezza
    return Array.isArray(this.stores) ? this.stores.slice() : [];
  }

  addStore(name) {
    if (!name || typeof name !== 'string') return false;
    const clean = name.trim();
    if (!clean) return false;
    // previeni duplicati case-insensitive
    const exists = this.stores.some(s => s.toLowerCase() === clean.toLowerCase());
    if (exists) return false;
    this.stores.push(clean);
    this.saveStores(this.stores);
    // popoliamo i select dopo la modifica
    this.populateAllStoreSelects();
    return true;
  }

  removeStore(name) {
    if (!name) return false;
    const before = this.stores.length;
    this.stores = this.stores.filter(s => s.toLowerCase() !== name.toLowerCase());
    if (this.stores.length === before) return false;
    this.saveStores(this.stores);
    this.populateAllStoreSelects();
    return true;
  }

  // Popola tutti i <select class="store-select"> trovati nella pagina corrente
  populateAllStoreSelects() {
    try {
      const selects = document.querySelectorAll('select.store-select');
      selects.forEach(select => {
        // keep current value to restore if still present
        const current = select.value;
        // clear existing
        select.innerHTML = '';
        // blank option
        const optBlank = document.createElement('option');
        optBlank.value = '';
        optBlank.textContent = 'Seleziona supermercato';
        select.appendChild(optBlank);

        // add stores
        this.getStores().forEach(storeName => {
          const opt = document.createElement('option');
          opt.value = storeName;
          opt.textContent = storeName;
          select.appendChild(opt);
        });

        // add "Altro"
        const optOther = document.createElement('option');
        optOther.value = 'Altro';
        optOther.textContent = 'Altro (specificare sotto)';
        select.appendChild(optOther);

        // restore value if possible
        if (current) {
          const has = Array.from(select.options).some(o => o.value === current);
          if (has) select.value = current;
        }
      });
    } catch (e) {
      console.error('populateAllStoreSelects error', e);
    }
  }
}

// istanza globale
const app = new ExpenseTracker();

// Popola selects all'avvio (se siamo su una pagina che ha select store)
document.addEventListener('DOMContentLoaded', () => {
  // populate store selects in the page
  app.populateAllStoreSelects();
});