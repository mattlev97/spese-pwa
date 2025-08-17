/* app.js - ExpenseTracker esteso: gestione images da OpenFoodFacts, carrello, eventi, archivio prodotti */

class ExpenseTracker {
  constructor() {
    this.expensesKey = 'expenses';
    this.storesKey = 'stores';
    this.productsArchiveKey = 'productsArchive'; // nuovo archivio prodotti

    this.defaultStores = [
      "Conad", "Coop", "Esselunga", "Eurospin",
      "Carrefour", "Lidl", "MD", "Pam", "Simply", "Iper"
    ];

    this.expenses = this.loadExpenses();
    this.currentCart = [];
    this.stores = this.loadStores();
    this.productsArchive = this.loadProductsArchive(); // caricamento archivio prodotti

    this._lastScannedImage = null;
    this._lastScannedBarcode = null;

    window.addEventListener('storage', (e) => {
      if (e.key === this.storesKey) {
        this.stores = this.loadStores();
        this.populateAllStoreSelects();
        document.dispatchEvent(new CustomEvent('app:stores-changed', { detail: this.stores }));
      }
      if (e.key === this.expensesKey) {
        this.expenses = this.loadExpenses();
        document.dispatchEvent(new CustomEvent('app:expenses-changed', { detail: this.expenses }));
      }
      if (e.key === this.productsArchiveKey) {
        this.productsArchive = this.loadProductsArchive();
      }
    });
  }

  // -------------------------
  // Expenses (CRUD)
  // -------------------------
  loadExpenses() {
    try {
      const raw = localStorage.getItem(this.expensesKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Errore parsing expenses da localStorage', e);
      return [];
    }
  }

  saveExpenses() {
    try {
      localStorage.setItem(this.expensesKey, JSON.stringify(this.expenses));
      document.dispatchEvent(new CustomEvent('app:expenses-changed', { detail: this.expenses }));
    } catch (e) {
      console.error('Errore salvataggio expenses', e);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
  }

  addExpense(store, date, products) {
    const expense = {
      id: this.generateId(),
      store,
      date,
      products: Array.isArray(products) ? products.map(p => ({ ...p })) : [],
      total: (products || []).reduce((sum, p) => sum + parseFloat(p.price || 0), 0),
      createdAt: new Date().toISOString()
    };

    this.expenses.push(expense);
    this.saveExpenses();
    return expense;
  }

  deleteExpense(id) {
    const before = this.expenses.length;
    this.expenses = this.expenses.filter(expense => expense.id !== id);
    if (this.expenses.length !== before) this.saveExpenses();
  }

  clearExpenses() {
    this.expenses = [];
    this.saveExpenses();
  }

  getExpenseById(id) {
    return this.expenses.find(e => e.id === id) || null;
  }

  updateExpenseProducts(expenseId, products) {
    const idx = this.expenses.findIndex(e => e.id === expenseId);
    if (idx === -1) return false;
    const total = (products || []).reduce((s,p) => s + parseFloat(p.price || 0), 0);
    this.expenses[idx].products = products.map(p => ({ ...p }));
    this.expenses[idx].total = total;
    this.saveExpenses();
    return true;
  }

  // -------------------------
  // Products Archive (nuovo)
  // -------------------------
  loadProductsArchive() {
    try {
      const raw = localStorage.getItem(this.productsArchiveKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Errore parsing productsArchive', e);
      return {};
    }
  }

  saveProductsArchive() {
    try {
      localStorage.setItem(this.productsArchiveKey, JSON.stringify(this.productsArchive));
    } catch (e) {
      console.error('Errore salvataggio productsArchive', e);
    }
  }

  updateProductArchive(product) {
    if (!product || !product.name) return;
    const key = product.name.trim().toLowerCase();
    const price = parseFloat(product.price) || 0;
    if (!this.productsArchive[key]) {
      this.productsArchive[key] = { name: product.name.trim(), minPrice: price };
      this.saveProductsArchive();
      return;
    }
    if (price < this.productsArchive[key].minPrice) {
      this.productsArchive[key].minPrice = price;
      this.saveProductsArchive();
    }
  }

  getProductPriceDifference(product) {
    if (!product || !product.name) return null;
    const key = product.name.trim().toLowerCase();
    const archiveEntry = this.productsArchive[key];
    if (!archiveEntry) return null;
    const current = parseFloat(product.price) || 0;
    const ref = parseFloat(archiveEntry.minPrice) || 0;
    if (ref <= 0) return null;
    const diff = ((current - ref) / ref) * 100;
    return { differencePercent: diff.toFixed(1), referencePrice: ref };
  }

  // -------------------------
  // Stats / formatting
  // -------------------------
  filterByPeriod(period) {
    if (!period) return this.expenses.slice();
    const now = new Date();
    const start = new Date();
    switch (period) {
      case 'settimana': start.setDate(now.getDate() - 7); break;
      case 'mese': start.setMonth(now.getMonth() - 1); break;
      case 'anno': start.setFullYear(now.getFullYear() - 1); break;
      default: return this.expenses.slice();
    }
    return this.expenses.filter(exp => new Date(exp.date) >= start);
  }

  getStats(expenses = this.expenses) {
    if (!expenses || expenses.length === 0) {
      return { total:0, count:0, max:{amount:0,store:''}, min:{amount:0,store:''}, avgPerExpense:0, storeStats:{}, categoryStats:{} };
    }
    const total = expenses.reduce((s,e)=> s + (parseFloat(e.total)||0), 0);
    const amounts = expenses.map(e => parseFloat(e.total)||0);
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    const maxExpense = expenses.find(e => e.total === maxAmount) || {};
    const minExpense = expenses.find(e => e.total === minAmount) || {};
    const storeStats = {};
    const categoryStats = {};
    expenses.forEach(exp => {
      if (!storeStats[exp.store]) storeStats[exp.store] = { count:0, total:0 };
      storeStats[exp.store].count++;
      storeStats[exp.store].total += parseFloat(exp.total || 0);
      (exp.products||[]).forEach(prod => {
        const cat = prod.category || 'Altro';
        if (!categoryStats[cat]) categoryStats[cat] = { count:0, total:0 };
        categoryStats[cat].count++;
        categoryStats[cat].total += parseFloat(prod.price || 0);
      });
    });
    return {
      total,
      count: expenses.length,
      max: { amount: maxAmount, store: maxExpense.store || '' },
      min: { amount: minAmount, store: minExpense.store || '' },
      avgPerExpense: total / expenses.length,
      storeStats, categoryStats
    };
  }

  formatCurrency(amount) {
    try {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
    } catch {
      return `€${Number(amount || 0).toFixed(2)}`;
    }
  }

  formatDate(dateString) {
    try {
      return new Intl.DateTimeFormat('it-IT', { year:'numeric', month:'short', day:'numeric' }).format(new Date(dateString));
    } catch {
      return dateString || '';
    }
  }

  // -------------------------
  // Stores management
  // -------------------------
  loadStores() {
    try {
      const raw = localStorage.getItem(this.storesKey);
      if (!raw) {
        this.saveStores(this.defaultStores.slice());
        return this.defaultStores.slice();
      }
      const parsed = JSON.parse(raw);
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
      const incoming = Array.isArray(list) ? list : this.stores || [];
      const cleanList = incoming
        .map(s => s && s.toString().trim())
        .filter(Boolean)
        .filter((s, i, arr) => arr.findIndex(x => x.toLowerCase() === s.toLowerCase()) === i);

      localStorage.setItem(this.storesKey, JSON.stringify(cleanList));
      this.stores = cleanList;
      this.populateAllStoreSelects();
      document.dispatchEvent(new CustomEvent('app:stores-changed', { detail: this.stores }));
    } catch (e) {
      console.error('Errore saveStores', e);
    }
  }

  getStores() { return Array.isArray(this.stores) ? [...this.stores] : []; }
  addStore(name) {
    if (!name || typeof name !== 'string') return false;
    const clean = name.trim();
    if (!clean) return false;
    if (!this.stores) this.stores = [];
    const exists = this.stores.some(s => s.toLowerCase() === clean.toLowerCase());
    if (exists) return false;
    this.stores.push(clean);
    this.saveStores(this.stores);
    return true;
  }
  removeStore(name) {
    if (!name) return false;
    const before = this.stores.length;
    this.stores = this.stores.filter(s => s.toLowerCase() !== name.toLowerCase());
    if (this.stores.length === before) return false;
    this.saveStores(this.stores);
    return true;
  }
  editStore(oldName, newName) {
    if (!oldName || !newName) return false;
    const cleanNew = newName.trim();
    if (!cleanNew) return false;
    const idx = this.stores.findIndex(s => s.toLowerCase() === oldName.toLowerCase());
    if (idx === -1) return false;
    if (this.stores.some((s, i) => i !== idx && s.toLowerCase() === cleanNew.toLowerCase())) return false;
    this.stores[idx] = cleanNew;
    this.saveStores(this.stores);
    return true;
  }
  ensureDefaultStores() { if (!this.stores || !this.stores.length) this.saveStores(this.defaultStores.slice()); }

  populateAllStoreSelects() {
    try {
      const selects = document.querySelectorAll('select.store-select');
      selects.forEach(select => {
        const currentValue = select.value || '';
        select.innerHTML = '';
        const optBlank = document.createElement('option');
        optBlank.value = '';
        optBlank.textContent = 'Seleziona supermercato';
        select.appendChild(optBlank);
        this.getStores().forEach(storeName => {
          const opt = document.createElement('option');
          opt.value = storeName;
          opt.textContent = storeName;
          select.appendChild(opt);
        });
        const optOther = document.createElement('option');
        optOther.value = 'Altro';
        optOther.textContent = 'Altro (specificare sotto)';
        select.appendChild(optOther);
        if (currentValue && Array.from(select.options).some(o => o.value === currentValue)) {
          select.value = currentValue;
        }
      });
    } catch (e) {
      console.error('populateAllStoreSelects error', e);
    }
  }

  // -------------------------
  // CART API
  // -------------------------
  addProductToCart(product) {
    const p = { id: product.id || this.generateId(), ...product };

    // aggiorna archivio prodotti
    this.updateProductArchive(p);

    // dispatch evento anche con differenza prezzo
    const diff = this.getProductPriceDifference(p);
    this.currentCart.push(p);
    document.dispatchEvent(new CustomEvent('app:cart-changed', { detail: this.currentCart }));
    if (diff) {
      document.dispatchEvent(new CustomEvent('app:price-difference', { detail: { product: p, diff } }));
    }
    return p;
  }

  removeProductFromCart(productId) {
    this.currentCart = this.currentCart.filter(p => p.id !== productId);
    document.dispatchEvent(new CustomEvent('app:cart-changed', { detail: this.currentCart }));
  }

  clearCart() {
    this.currentCart = [];
    document.dispatchEvent(new CustomEvent('app:cart-changed', { detail: this.currentCart }));
  }

  getCartTotal() {
    return this.currentCart.reduce((s,p) => s + (parseFloat(p.price)||0), 0);
  }

  saveCartAsExpense(store, date) {
    if (!store || !date) return null;
    const saved = this.addExpense(store, date, this.currentCart);
    this.clearCart();
    return saved;
  }

  // -------------------------
  // Scanned image helpers
  // -------------------------
  setLastScannedImage(urlOrNull) {
    this._lastScannedImage = urlOrNull || null;
    document.dispatchEvent(new CustomEvent('app:last-scanned-image-changed', { detail: this._lastScannedImage }));
  }
  getLastScannedImage() { return this._lastScannedImage; }
  setLastScannedBarcode(code) { this._lastScannedBarcode = code || null; }
  getLastScannedBarcode() { return this._lastScannedBarcode; }
}

// esponi istanza globale
const app = new ExpenseTracker();

document.addEventListener('DOMContentLoaded', () => {
  try { app.populateAllStoreSelects(); } catch (e) {}
  document.dispatchEvent(new CustomEvent('app:cart-changed', { detail: app.currentCart }));
});