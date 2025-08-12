// app.js — Gestione spese unificata (expenses + stores)

class ExpenseTracker {
  constructor() {
    this.expenses = this.loadExpenses();
    this.stores = this.loadStores();
    this.currentCart = [];
    this.deleteExpenseId = null;

    // Se non hai stores predefiniti, inizializza con una lista utile
    if (!this.stores || !this.stores.length) {
      this.stores = [
        "Conad", "Coop", "Esselunga", "Eurospin", "Carrefour",
        "Lidl", "MD", "Pam", "Simply", "Iper"
      ];
      this.saveStores();
    }
  }

  /* -------------------------
     Persistenza: expenses
     ------------------------- */
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
      console.error('Errore salvataggio expenses su localStorage', e);
    }
  }

  /* -------------------------
     Persistenza: stores
     ------------------------- */
  loadStores() {
    try {
      const stored = localStorage.getItem('stores');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Errore parsing stores da localStorage', e);
      return [];
    }
  }

  saveStores() {
    try {
      localStorage.setItem('stores', JSON.stringify(this.stores));
    } catch (e) {
      console.error('Errore salvataggio stores su localStorage', e);
    }
  }

  addStore(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return false;
    if (!this.stores.includes(trimmed)) {
      this.stores.push(trimmed);
      this.stores.sort((a, b) => a.localeCompare(b, 'it'));
      this.saveStores();
    }
    return true;
  }

  removeStore(name) {
    const idx = this.stores.indexOf(name);
    if (idx === -1) return false;
    this.stores.splice(idx, 1);
    this.saveStores();
    return true;
  }

  setStores(list) {
    this.stores = Array.isArray(list) ? list.map(s => String(s).trim()).filter(Boolean) : [];
    this.stores = [...new Set(this.stores)].sort((a, b) => a.localeCompare(b, 'it'));
    this.saveStores();
  }

  /* -------------------------
     Utilità generali
     ------------------------- */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  }

  formatDate(dateString) {
    return new Intl.DateTimeFormat('it-IT', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateString));
  }

  /* -------------------------
     CRUD spesa
     ------------------------- */
  addExpense(store, date, products) {
    const trimmedStore = (store || '').trim();
    if (!trimmedStore) throw new Error('Store obbligatorio');
    if (!date) throw new Error('Date obbligatoria');
    if (!Array.isArray(products) || products.length === 0) throw new Error('Prodotti richiesti');

    // Calcola totale (assume p.price numeric)
    const total = products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

    const expense = {
      id: this.generateId(),
      store: trimmedStore,
      date,
      products: products.map(p => ({
        id: p.id || this.generateId(),
        name: p.name || '',
        category: p.category || 'Altro',
        price: parseFloat(p.price) || 0,
        priceKg: p.priceKg != null ? parseFloat(p.priceKg) : null,
        notes: p.notes || ''
      })),
      total,
      createdAt: new Date().toISOString()
    };

    // Se lo store non è presente nell'elenco, aggiungilo
    if (!this.stores.includes(trimmedStore)) {
      this.stores.push(trimmedStore);
      this.stores.sort((a, b) => a.localeCompare(b, 'it'));
      this.saveStores();
    }

    this.expenses.push(expense);
    this.saveExpenses();
    return expense;
  }

  deleteExpense(id) {
    const before = this.expenses.length;
    this.expenses = this.expenses.filter(e => e.id !== id);
    if (this.expenses.length !== before) {
      this.saveExpenses();
      return true;
    }
    return false;
  }

  /* -------------------------
     Filtri / statistiche
     ------------------------- */
  filterByPeriod(period, expenses = this.expenses) {
    if (!period) return expenses.slice();

    const now = new Date();
    const startDate = new Date(now);

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
        return expenses.slice();
    }

    return expenses.filter(exp => new Date(exp.date) >= startDate);
  }

  getStats(expenses = this.expenses) {
    if (!expenses || expenses.length === 0) {
      return {
        total: 0,
        count: 0,
        max: { amount: 0, store: '' },
        min: { amount: 0, store: '' },
        avgPerExpense: 0,
        storeStats: {},
        categoryStats: {}
      };
    }

    const total = expenses.reduce((s, e) => s + (e.total || 0), 0);
    const counts = expenses.map(e => e.total || 0);
    const maxAmount = Math.max(...counts);
    const minAmount = Math.min(...counts);
    const maxExpense = expenses.find(e => (e.total || 0) === maxAmount) || { store: '' };
    const minExpense = expenses.find(e => (e.total || 0) === minAmount) || { store: '' };

    const storeStats = {};
    const categoryStats = {};

    expenses.forEach(exp => {
      // store stats
      const s = exp.store || 'Sconosciuto';
      if (!storeStats[s]) storeStats[s] = { count: 0, total: 0 };
      storeStats[s].count++;
      storeStats[s].total += (exp.total || 0);

      // category stats (per prodotto)
      (exp.products || []).forEach(p => {
        const c = p.category || 'Altro';
        if (!categoryStats[c]) categoryStats[c] = { count: 0, total: 0 };
        categoryStats[c].count++;
        categoryStats[c].total += (parseFloat(p.price) || 0);
      });
    });

    return {
      total,
      count: expenses.length,
      max: { amount: maxAmount, store: maxExpense.store },
      min: { amount: minAmount, store: minExpense.store },
      avgPerExpense: total / expenses.length,
      storeStats,
      categoryStats
    };
  }
}

/* ===== Istanza globale condivisa ===== */
const app = new ExpenseTracker();

/* Compatibility helper: assicurati che venga esportato in ambienti diversi
   (opzionale, utile se vuoi includere app.js come modulo in futuro)
*/
if (typeof window !== 'undefined') {
  window.app = app;
}