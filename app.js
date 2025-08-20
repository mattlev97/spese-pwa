/* app.js - ExpenseTracker esteso: gestione images da OpenFoodFacts, carrello, eventi, archivio prezzi */

class ExpenseTracker {
  constructor() {
    this.expensesKey = 'expenses';
    this.storesKey = 'stores';
    this.productsKey = 'productsReference'; // archivio interno prezzi

    this.defaultStores = [
      "Conad", "Coop", "Esselunga", "Eurospin",
      "Carrefour", "Lidl", "MD", "Pam", "Simply", "Iper"
    ];

    this.expenses = this.loadExpenses();
    this.currentCart = [];
    this.stores = this.loadStores();
    this.productsReference = this.loadProductsReference();

    // ultimo barcode / immagine recuperata dall'API (url) — usato da aggiungi pagina
    this._lastScannedImage = null;
    this._lastScannedBarcode = null;

    // keep storage sync across tabs
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
      if (e.key === this.productsKey) {
        this.productsReference = this.loadProductsReference();
        document.dispatchEvent(new CustomEvent('app:productsReference-changed', { detail: this.productsReference }));
      }
    });
  }

  // -------------------------
  // Archivio prodotti
  // -------------------------
  loadProductsReference() {
    try {
      const raw = localStorage.getItem(this.productsKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("Errore loadProductsReference", e);
      return {};
    }
  }

  saveProductsReference() {
    try {
      localStorage.setItem(this.productsKey, JSON.stringify(this.productsReference || {}));
      document.dispatchEvent(new CustomEvent('app:productsReference-changed', { detail: this.productsReference }));
    } catch (e) {
      console.error("Errore saveProductsReference", e);
    }
  }

  /**
   * Aggiorna l'archivio referenze prodotto. Registra solo il prezzo minimo osservato.
   * product: { name, price, priceKg?, ... }
   */
  updateProductReference(product) {
    try {
      if (!product || !product.name) return;
      const name = product.name.trim().toLowerCase();
      const price = parseFloat(product.price) || 0;
      if (!name || !price) return;

      if (!this.productsReference) this.productsReference = {};
      if (!this.productsReference[name]) {
        this.productsReference[name] = { minPrice: price, lastSeen: new Date().toISOString() };
      } else {
        if (price < (this.productsReference[name].minPrice || Infinity)) {
          this.productsReference[name].minPrice = price;
        }
        this.productsReference[name].lastSeen = new Date().toISOString();
      }
      this.saveProductsReference();
    } catch (e) {
      console.error('updateProductReference error', e);
    }
  }

  getProductReference(name) {
    if (!name) return null;
    try {
      const key = name.trim().toLowerCase();
      return (this.productsReference && this.productsReference[key]) ? this.productsReference[key] : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Confronta il prodotto passato con la referenza (minPrice).
   * Ritorna { reference: number, difference: number } oppure null
   */
  compareWithReference(product) {
    try {
      if (!product || !product.name) return null;
      const ref = this.getProductReference(product.name);
      if (!ref || typeof ref.minPrice === 'undefined') return null;
      const current = parseFloat(product.price) || 0;
      if (!current || !ref.minPrice) return null;
      const diff = ((current - ref.minPrice) / ref.minPrice) * 100;
      return { reference: ref.minPrice, difference: diff };
    } catch (e) {
      console.error('compareWithReference error', e);
      return null;
    }
  }

  // -------------------------
  // Expenses (CRUD) + helpers
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
      localStorage.setItem(this.expensesKey, JSON.stringify(this.expenses || []));
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

    // aggiorna archivio prezzi usando i prodotti salvati (non si modifica spese passate,
    // ma l'archivio rappresenta il prezzo minimo osservato)
    (expense.products || []).forEach(p => {
      try { this.updateProductReference(p); } catch (e) { /* ignore per singolo prodotto */ }
    });

    return expense;
  }

  deleteExpense(id) {
    try {
      const before = this.expenses.length;
      this.expenses = this.expenses.filter(expense => expense.id !== id);
      if (this.expenses.length !== before) this.saveExpenses();
    } catch (e) {
      console.error('deleteExpense error', e);
    }
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
  // Stats / formatting
  // -------------------------
  /* Helper interno: normalizza input referenceDate (accetta YYYY-MM-DD string o Date obj)
     e ritorna { dateObj, key } dove key è 'YYYY-MM-DD' */
  _normalizeReferenceDate(referenceDate) {
    let d;
    if (!referenceDate) {
      d = new Date();
    } else if (referenceDate instanceof Date) {
      d = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    } else if (typeof referenceDate === 'string') {
      // expected 'YYYY-MM-DD' (HTML date input). Create Date using split to avoid timezone shifts.
      const parts = referenceDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        d = new Date(y, m, day);
      } else {
        d = new Date(referenceDate);
      }
    } else {
      d = new Date();
    }
    // ensure we have valid date
    if (isNaN(d.getTime())) d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    return { dateObj: d, key };
  }

  /* Helper: formatta una Date object come 'YYYY-MM-DD' */
  _formatKeyFromDateObj(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /* filterByPeriod ora supporta la firma:
     filterByPeriod(period, referenceDate)
     - period: 'giorno'|'settimana'|'mese'|'anno'|'settimana'|'mese'|'anno' (o undefined)
     - referenceDate: optional, string 'YYYY-MM-DD' o Date object. Se non presente usa oggi.
     Ritorna array di expense filtrate.
     Mantiene retrocompatibilità se chiamata con un solo argomento.
  */
  filterByPeriod(period, referenceDate) {
    // Retrocompat: se chiamato con un singolo argomento non string (es. undefined) => return all
    if (!period) return this.expenses.slice();

    // Normalize period: accept italian names + fallback
    const p = String(period || '').toLowerCase();

    // normalize reference date
    const norm = this._normalizeReferenceDate(referenceDate);
    const refDateObj = norm.dateObj;

    // compute range start/end
    let rangeStart = null;
    let rangeEnd = null;

    if (p === 'giorno' || p === 'day') {
      const key = norm.key;
      return (this.expenses || []).filter(e => (e.date === key));
    }

    if (p === 'settimana' || p === 'week') {
      // ISO-like week: Monday .. Sunday
      const day = refDateObj.getDay(); // 0(Sun)..6
      // compute Monday: diff days from Monday
      const diffToMonday = (day === 0) ? 6 : (day - 1);
      const monday = new Date(refDateObj);
      monday.setDate(refDateObj.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      rangeStart = this._formatKeyFromDateObj(monday);
      rangeEnd = this._formatKeyFromDateObj(sunday);
    } else if (p === 'mese' || p === 'month') {
      const first = new Date(refDateObj.getFullYear(), refDateObj.getMonth(), 1);
      const last = new Date(refDateObj.getFullYear(), refDateObj.getMonth() + 1, 0); // last day of month
      rangeStart = this._formatKeyFromDateObj(first);
      rangeEnd = this._formatKeyFromDateObj(last);
    } else if (p === 'anno' || p === 'year') {
      const first = new Date(refDateObj.getFullYear(), 0, 1);
      const last = new Date(refDateObj.getFullYear(), 11, 31);
      rangeStart = this._formatKeyFromDateObj(first);
      rangeEnd = this._formatKeyFromDateObj(last);
    } else {
      // unknown period: fallback to previous behaviour (period interpreted relative to "now")
      // Maintain previous semantics: settimana=>last 7 days, mese=>last month, anno=>last year
      const now = new Date();
      const start = new Date();
      switch (p) {
        case 'settimana':
          start.setDate(now.getDate() - 7);
          break;
        case 'mese':
          start.setMonth(now.getMonth() - 1);
          break;
        case 'anno':
          start.setFullYear(now.getFullYear() - 1);
          break;
        default:
          return this.expenses.slice();
      }
      rangeStart = this._formatKeyFromDateObj(start);
      rangeEnd = this._formatKeyFromDateObj(now);
    }

    // Now filter expenses whose date (assumed 'YYYY-MM-DD') is between rangeStart and rangeEnd (inclusive).
    // Use string compare which works for 'YYYY-MM-DD' format.
    try {
      const all = this.expenses || [];
      return all.filter(exp => {
        const d = exp.date || '';
        if (!d) return false;
        return (d >= rangeStart && d <= rangeEnd);
      });
    } catch (e) {
      console.error('filterByPeriod error', e);
      return this.expenses.slice();
    }
  }

  getStats(expenses = this.expenses) {
    if (!expenses || expenses.length === 0) {
      return { total:0, count:0, max:{amount:0,store:''}, min:{amount:0,store:''}, avgPerExpense:0, storeStats:{}, categoryStats:{} };
    }
    const total = expenses.reduce((s,e)=> s + (parseFloat(e.total)||0), 0);
    const amounts = expenses.map(e => parseFloat(e.total)||0);
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    const maxExpense = expenses.find(e => parseFloat(e.total) === maxAmount) || {};
    const minExpense = expenses.find(e => parseFloat(e.total) === minAmount) || {};
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
  // CART API (event-driven)
  // -------------------------
  addProductToCart(product) {
    // product: { id?, name, price, category, notes, image? }
    const p = { id: product.id || this.generateId(), ...product };
    // attach price comparison if possible
    try {
      const comparison = this.compareWithReference(p);
      if (comparison) p._priceComparison = comparison;
    } catch (e) { /* ignore */ }

    this.currentCart.push(p);
    document.dispatchEvent(new CustomEvent('app:cart-changed', { detail: this.currentCart }));
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
    // before saving, ensure we don't mutate past expenses but update reference archive with current cart prices
    try {
      // Create copy of products to persist in expense
      const toSaveProducts = (this.currentCart || []).map(p => ({ ...p }));
      const saved = this.addExpense(store, date, toSaveProducts);
      // clear cart after save
      this.clearCart();
      return saved;
    } catch (e) {
      console.error('saveCartAsExpense error', e);
      return null;
    }
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

// on DOM ready, populate selects and emit initial state
document.addEventListener('DOMContentLoaded', () => {
  try { app.populateAllStoreSelects(); } catch (e) {}
  // emit initial cart state
  document.dispatchEvent(new CustomEvent('app:cart-changed', { detail: app.currentCart }));
  // emit productsReference changed (initial)
  document.dispatchEvent(new CustomEvent('app:productsReference-changed', { detail: app.productsReference }));
});