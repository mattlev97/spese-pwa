// Gestione spese - App principale
class ExpenseTracker {
constructor() {
this.expenses = this.loadExpenses();
this.currentCart = [];
this.deleteExpenseId = null;
}

```
// Carica spese da localStorage
loadExpenses() {
    const stored = localStorage.getItem('expenses');
    return stored ? JSON.parse(stored) : [];
}

// Salva spese in localStorage
saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(this.expenses));
}

// Genera ID univoco
generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Aggiungi spesa
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

// Elimina spesa
deleteExpense(id) {
    this.expenses = this.expenses.filter(expense => expense.id !== id);
    this.saveExpenses();
}

// Filtra spese per periodo
filterByPeriod(period) {
    const now = new Date();
    const startDate = new Date();

    switch(period) {
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
            return this.expenses;
    }

    return this.expenses.filter(expense => 
        new Date(expense.date) >= startDate
    );
}

// Ottieni statistiche
getStats(expenses = this.expenses) {
    if (!expenses.length) {
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

    const total = expenses.reduce((sum, exp) => sum + exp.total, 0);
    const amounts = expenses.map(exp => exp.total);
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    
    const maxExpense = expenses.find(exp => exp.total === maxAmount);
    const minExpense = expenses.find(exp => exp.total === minAmount);

    // Statistiche per supermercato
    const storeStats = {};
    expenses.forEach(expense => {
        if (!storeStats[expense.store]) {
            storeStats[expense.store] = { count: 0, total: 0 };
        }
        storeStats[expense.store].count++;
        storeStats[expense.store].total += expense.total;
    });

    // Statistiche per categoria
    const categoryStats = {};
    expenses.forEach(expense => {
        expense.products.forEach(product => {
            if (!categoryStats[product.category]) {
                categoryStats[product.category] = { count: 0, total: 0 };
            }
            categoryStats[product.category].count++;
            categoryStats[product.category].total += parseFloat(product.price || 0);
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

// Formatta valuta
formatCurrency(amount) {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount || 0);
}

// Formatta data
formatDate(dateString) {
    return new Intl.DateTimeFormat('it-IT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(new Date(dateString));
}
```

}

// Istanza globale
const app = new ExpenseTracker();

// === DASHBOARD ===
function loadDashboard() {
const period = document.getElementById(‘periodSelect’)?.value || ‘mese’;
const filteredExpenses = app.filterByPeriod(period);
const stats = app.getStats(filteredExpenses);

```
// Aggiorna statistiche
updateStatsDisplay(stats);

// Carica grafici
loadCharts(stats);

// Carica spese recenti
loadRecentExpenses(filteredExpenses);
```

}

function updateStatsDisplay(stats) {
const elements = {
totalAmount: document.getElementById(‘totalAmount’),
maxAmount: document.getElementById(‘maxAmount’),
minAmount: document.getElementById(‘minAmount’),
totalExpenses: document.getElementById(‘totalExpenses’),
maxStore: document.getElementById(‘maxStore’),
minStore: document.getElementById(‘minStore’)
};

```
if (elements.totalAmount) elements.totalAmount.textContent = app.formatCurrency(stats.total);
if (elements.maxAmount) elements.maxAmount.textContent = app.formatCurrency(stats.max.amount);
if (elements.minAmount) elements.minAmount.textContent = app.formatCurrency(stats.min.amount);
if (elements.totalExpenses) elements.totalExpenses.textContent = stats.count;
if (elements.maxStore) elements.maxStore.textContent = stats.max.store;
if (elements.minStore) elements.minStore.textContent = stats.min.store;
```

}

function loadCharts(stats) {
drawPieChart(‘storeChart’, stats.storeStats, ‘storeStats’);
drawPieChart(‘categoryChart’, stats.categoryStats, ‘categoryStats’);
}

function drawPieChart(canvasId, data, statsId) {
const canvas = document.getElementById(canvasId);
const statsDiv = document.getElementById(statsId);

```
if (!canvas || !statsDiv) return;

const ctx = canvas.getContext('2d');
const entries = Object.entries(data).sort((a, b) => b[1].total - a[1].total).slice(0, 6);

if (entries.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Nessun dato', canvas.width/2, canvas.height/2);
    statsDiv.innerHTML = '<div style="text-align: center; color: #666;">Nessun dato disponibile</div>';
    return;
}

// Colori per il grafico
const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#607D8B'];

// Calcola angoli
const total = entries.reduce((sum, [, data]) => sum + data.total, 0);
let currentAngle = -Math.PI / 2;

// Pulisci canvas
ctx.clearRect(0, 0, canvas.width, canvas.height);

// Disegna settori
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = Math.min(centerX, centerY) - 20;

entries.forEach(([label, data], index) => {
    const sliceAngle = (data.total / total) * 2 * Math.PI;
    
    // Disegna settore
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    
    // Bordo bianco
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    currentAngle += sliceAngle;
});

// Aggiorna statistiche testuali
statsDiv.innerHTML = entries.map(([label, data], index) => 
    `<div>
        <span style="color: ${colors[index % colors.length]}">● ${label}</span>
        <span>${app.formatCurrency(data.total)}</span>
    </div>`
).join('');
```

}

function loadRecentExpenses(expenses) {
const recentList = document.getElementById(‘recentList’);
if (!recentList) return;

```
const recent = expenses.slice(-5).reverse();

if (recent.length === 0) {
    recentList.innerHTML = '<div class="no-expenses">Nessuna spesa recente</div>';
    return;
}

recentList.innerHTML = recent.map(expense => `
    <div class="recent-item">
        <div class="recent-info">
            <strong>🏪 ${expense.store}</strong>
            <small>📅 ${app.formatDate(expense.date)} • ${expense.products.length} prodotti</small>
        </div>
        <div class="recent-amount">${app.formatCurrency(expense.total)}</div>
    </div>
`).join('');
```

}

// === AGGIUNGI SPESA ===
function initAddExpense() {
console.log(‘🚀 Inizializzazione pagina aggiungi spesa…’);

```
const today = new Date().toISOString().split('T')[0];
const dateInput = document.getElementById('expenseDate');
if (dateInput) {
    dateInput.value = today;
    console.log('📅 Data impostata:', today);
}

// Event listeners con controllo errori
const storeSelect = document.getElementById('storeSelect');
const addProductBtn = document.getElementById('addProductBtn');
const saveExpenseBtn = document.getElementById('saveExpenseBtn');
const clearCartBtn = document.getElementById('clearCartBtn');
const expenseForm = document.getElementById('expenseForm');

if (storeSelect) {
    storeSelect.addEventListener('change', toggleCustomStore);
    console.log('✅ Event listener supermercato aggiunto');
} else {
    console.warn('⚠️ Elemento storeSelect non trovato');
}

if (addProductBtn) {
    // Rimuovi listener esistenti e aggiungine uno nuovo
    addProductBtn.removeEventListener('click', addProductToCart);
    addProductBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('🖱️ Click su aggiungi prodotto');
        addProductToCart();
    });
    console.log('✅ Event listener aggiungi prodotto aggiunto');
} else {
    console.warn('⚠️ Elemento addProductBtn non trovato');
}

if (saveExpenseBtn) {
    saveExpenseBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('🖱️ Click su salva spesa');
        saveExpense();
    });
    console.log('✅ Event listener salva spesa aggiunto');
}

if (clearCartBtn) {
    clearCartBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('🖱️ Click su pulisci carrello');
        clearCart();
    });
    console.log('✅ Event listener pulisci carrello aggiunto');
}

if (expenseForm) {
    expenseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('📝 Submit form spesa');
        saveExpense();
    });
    console.log('✅ Event listener form aggiunto');
}

// Reset carrello
app.currentCart = [];
updateCartDisplay();
console.log('🛒 Carrello resettato');

// Verifica elementi critici
const criticalElements = [
    'productCategory', 'productName', 'productPrice', 
    'cartSection', 'cartBody', 'cartTotal'
];

criticalElements.forEach(id => {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`⚠️ Elemento critico mancante: ${id}`);
    }
});

console.log('✅ Inizializzazione completata');
```

}

function toggleCustomStore() {
const storeSelect = document.getElementById(‘storeSelect’);
const customStoreGroup = document.getElementById(‘customStoreGroup’);

```
if (storeSelect && customStoreGroup) {
    if (storeSelect.value === 'Altro') {
        customStoreGroup.style.display = 'block';
        document.getElementById('customStore').required = true;
    } else {
        customStoreGroup.style.display = 'none';
        document.getElementById('customStore').required = false;
    }
}
```

}

function addProductToCart() {
console.log(‘🛒 Tentativo aggiunta prodotto al carrello…’);

```
// Ottieni elementi
const categoryEl = document.getElementById('productCategory');
const nameEl = document.getElementById('productName');
const priceEl = document.getElementById('productPrice');
const priceKgEl = document.getElementById('productPriceKg');
const notesEl = document.getElementById('productNotes');

// Verifica che gli elementi esistano
if (!categoryEl || !nameEl || !priceEl) {
    console.error('❌ Elementi form non trovati');
    alert('❌ Errore: elementi del form non trovati');
    return;
}

// Ottieni valori
const category = categoryEl.value.trim();
const name = nameEl.value.trim();
const priceValue = priceEl.value.trim();
const price = parseFloat(priceValue);
const priceKg = priceKgEl ? (parseFloat(priceKgEl.value) || null) : null;
const notes = notesEl ? notesEl.value.trim() : '';

console.log('📝 Dati prodotto:', { category, name, priceValue, price, priceKg, notes });

// Validazione dettagliata
if (!category) {
    alert('⚠️ Seleziona una tipologia di prodotto');
    categoryEl.focus();
    return;
}

if (!name) {
    alert('⚠️ Inserisci il nome del prodotto');
    nameEl.focus();
    return;
}

if (!priceValue || isNaN(price) || price <= 0) {
    alert('⚠️ Inserisci un prezzo valido maggiore di 0');
    priceEl.focus();
    return;
}

// Crea prodotto
const product = {
    id: app.generateId(),
    category,
    name,
    price: price,
    priceKg: priceKg,
    notes: notes
};

console.log('✅ Prodotto creato:', product);

// Aggiungi al carrello
app.currentCart.push(product);
console.log('🛒 Carrello aggiornato:', app.currentCart);

// Aggiorna display
updateCartDisplay();
clearProductForm();

// Feedback visivo
const addBtn = document.getElementById('addProductBtn');
if (addBtn) {
    addBtn.classList.add('pulse');
    setTimeout(() => addBtn.classList.remove('pulse'), 300);
}

// Feedback utente
console.log('✅ Prodotto aggiunto con successo al carrello');

// Scroll al carrello se è la prima aggiunta
if (app.currentCart.length === 1) {
    const cartSection = document.getElementById('cartSection');
    if (cartSection) {
        cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
```

}

function updateCartDisplay() {
console.log(‘🔄 Aggiornamento display carrello…’);

```
const cartSection = document.getElementById('cartSection');
const cartBody = document.getElementById('cartBody');
const cartTotal = document.getElementById('cartTotal');
const saveBtn = document.getElementById('saveExpenseBtn');

if (!cartSection || !cartBody || !cartTotal || !saveBtn) {
    console.error('❌ Elementi carrello non trovati:', {
        cartSection: !!cartSection,
        cartBody: !!cartBody,
        cartTotal: !!cartTotal,
        saveBtn: !!saveBtn
    });
    return;
}

console.log('🛒 Prodotti nel carrello:', app.currentCart.length);

if (app.currentCart.length === 0) {
    cartSection.style.display = 'none';
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.5';
    console.log('📦 Carrello vuoto - sezione nascosta');
    return;
}

cartSection.style.display = 'block';
saveBtn.disabled = false;
saveBtn.style.opacity = '1';

// Aggiorna tabella prodotti
cartBody.innerHTML = app.currentCart.map((product, index) => {
    console.log(`📦 Rendering prodotto ${index + 1}:`, product);
    return `
        <tr>
            <td>
                <strong>${escapeHtml(product.name)}</strong><br>
                <small style="color: #666;">${escapeHtml(product.category)}</small>
                ${product.notes ? `<br><small style="color: #888;">📝 ${escapeHtml(product.notes)}</small>` : ''}
                ${product.priceKg ? `<br><small style="color: #666;">💰 ${app.formatCurrency(product.priceKg)}/kg</small>` : ''}
            </td>
            <td><strong>${app.formatCurrency(product.price)}</strong></td>
            <td>
                <button type="button" class="remove-btn" onclick="removeFromCart('${product.id}')" title="Rimuovi prodotto">
                    🗑️
                </button>
            </td>
        </tr>
    `;
}).join('');

// Aggiorna totale
const total = app.currentCart.reduce((sum, product) => sum + product.price, 0);
cartTotal.textContent = app.formatCurrency(total);

console.log('✅ Display carrello aggiornato - Totale:', app.formatCurrency(total));

// Aggiungi animazione fade-in
cartSection.classList.add('fade-in');
```

}

// Funzione helper per escape HTML
function escapeHtml(text) {
const div = document.createElement(‘div’);
div.textContent = text || ‘’;
return div.innerHTML;
}

function removeFromCart(productId) {
app.currentCart = app.currentCart.filter(product => product.id !== productId);
updateCartDisplay();
}

function clearProductForm() {
document.getElementById(‘productCategory’).value = ‘’;
document.getElementById(‘productName’).value = ‘’;
document.getElementById(‘productPrice’).value = ‘’;
document.getElementById(‘productPriceKg’).value = ‘’;
document.getElementById(‘productNotes’).value = ‘’;
}

function clearCart() {
if (app.currentCart.length === 0) return;

```
if (confirm('🗑️ Sei sicuro di voler svuotare il carrello?')) {
    app.currentCart = [];
    updateCartDisplay();
}
```

}

function saveExpense() {
const storeSelect = document.getElementById(‘storeSelect’);
const customStore = document.getElementById(‘customStore’);
const expenseDate = document.getElementById(‘expenseDate’);

```
if (!storeSelect || !expenseDate) return;

const store = storeSelect.value === 'Altro' ? customStore.value : storeSelect.value;
const date = expenseDate.value;

// Validazione
if (!store || !date || app.currentCart.length === 0) {
    alert('⚠️ Compila tutti i campi e aggiungi almeno un prodotto');
    return;
}

try {
    app.addExpense(store, date, app.currentCart);
    
    // Feedback successo
    alert('✅ Spesa salvata con successo!');
    
    // Reset form
    document.getElementById('expenseForm').reset();
    app.currentCart = [];
    updateCartDisplay();
    toggleCustomStore();
    
    // Imposta data odierna
    const today = new Date().toISOString().split('T')[0];
    expenseDate.value = today;
    
} catch (error) {
    console.error('Errore nel salvare la spesa:', error);
    alert('❌ Errore nel salvare la spesa. Riprova.');
}
```

}

// === ARCHIVIO ===
function initArchive() {
loadStoreFilter();
loadExpensesList();

```
// Event listeners per filtri
const filters = ['periodFilter', 'storeFilter', 'categoryFilter'];
filters.forEach(filterId => {
    const element = document.getElementById(filterId);
    if (element) {
        element.addEventListener('change', loadExpensesList);
    }
});

const clearFiltersBtn = document.getElementById('clearFiltersBtn');
if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearFilters);
}

// Modal gestione
const deleteModal = document.getElementById('deleteModal');
const confirmDelete = document.getElementById('confirmDelete');
const cancelDelete = document.getElementById('cancelDelete');

if (confirmDelete) {
    confirmDelete.addEventListener('click', () => {
        if (app.deleteExpenseId) {
            app.deleteExpense(app.deleteExpenseId);
            app.deleteExpenseId = null;
            loadExpensesList();
            closeModal();
            alert('✅ Spesa eliminata');
        }
    });
}

if (cancelDelete) {
    cancelDelete.addEventListener('click', closeModal);
}

// Chiudi modal cliccando fuori
if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeModal();
    });
}
```

}

function loadStoreFilter() {
const storeFilter = document.getElementById(‘storeFilter’);
if (!storeFilter) return;

```
// Ottieni tutti i supermercati unici
const stores = [...new Set(app.expenses.map(expense => expense.store))].sort();

// Mantieni le opzioni di base e aggiungi quelle personalizzate
const defaultOption = storeFilter.querySelector('option[value=""]');
storeFilter.innerHTML = '';
storeFilter.appendChild(defaultOption);

stores.forEach(store => {
    const option = document.createElement('option');
    option.value = store;
    option.textContent = store;
    storeFilter.appendChild(option);
});
```

}

function loadExpensesList() {
const expensesList = document.getElementById(‘expensesList’);
const noExpenses = document.getElementById(‘noExpenses’);
const filteredCount = document.getElementById(‘filteredCount’);
const filteredTotal = document.getElementById(‘filteredTotal’);

```
if (!expensesList) return;

// Applica filtri
let expenses = [...app.expenses];

// Filtro periodo
const period = document.getElementById('periodFilter')?.value;
if (period) {
    expenses = app.filterByPeriod(period);
}

// Filtro supermercato
const store = document.getElementById('storeFilter')?.value;
if (store) {
    expenses = expenses.filter(expense => expense.store === store);
}

// Filtro categoria
const category = document.getElementById('categoryFilter')?.value;
if (category) {
    expenses = expenses.filter(expense => 
        expense.products.some(product => product.category === category)
    );
}

// Ordina per data (più recenti prima)
expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

// Aggiorna statistiche filtrate
if (filteredCount) {
    filteredCount.textContent = `${expenses.length} spese trovate`;
}
if (filteredTotal) {
    const total = expenses.reduce((sum, exp) => sum + exp.total, 0);
    filteredTotal.textContent = `Totale: ${app.formatCurrency(total)}`;
}

// Mostra/nascondi messaggio vuoto
if (expenses.length === 0) {
    expensesList.innerHTML = '';
    if (noExpenses) noExpenses.style.display = 'block';
    return;
}

if (noExpenses) noExpenses.style.display = 'none';

// Genera lista spese
expensesList.innerHTML = expenses.map(expense => `
    <div class="expense-item fade-in">
        <div class="expense-header">
            <div class="expense-info">
                <h4>🏪 ${expense.store}</h4>
                <small>📅 ${app.formatDate(expense.date)}</small>
            </div>
            <div class="expense-total">${app.formatCurrency(expense.total)}</div>
        </div>
        
        <div class="expense-products">
            <h5>🛒 Prodotti (${expense.products.length}):</h5>
            <div class="product-list">
                ${expense.products.map(product => `
                    <div class="product-item">
                        <div class="product-info">
                            <strong>${product.name}</strong>
                            <div class="category">${product.category}</div>
                            ${product.notes ? `<div class="category">📝 ${product.notes}</div>` : ''}
                        </div>
                        <div class="product-price">${app.formatCurrency(product.price)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="expense-actions">
            <button class="delete-btn" onclick="confirmDeleteExpense('${expense.id}')">
                🗑️ Elimina
            </button>
        </div>
    </div>
`).join('');
```

}

function clearFilters() {
const filters = [‘periodFilter’, ‘storeFilter’, ‘categoryFilter’];
filters.forEach(filterId => {
const element = document.getElementById(filterId);
if (element) element.value = ‘’;
});
loadExpensesList();
}

function confirmDeleteExpense(expenseId) {
app.deleteExpenseId = expenseId;
const modal = document.getElementById(‘deleteModal’);
if (modal) modal.style.display = ‘block’;
}

function closeModal() {
const modal = document.getElementById(‘deleteModal’);
if (modal) modal.style.display = ‘none’;
app.deleteExpenseId = null;
}