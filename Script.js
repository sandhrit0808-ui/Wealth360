/* =============================================================
   WEALTH360 — SCRIPT
   Organized in sections so a non-technical founder can find things:
   1. Navigation (switching between the 6 screens)
   Later stages will add: data layer, calculations, rendering, etc.
   Each new stage gets its own clearly labeled section below.
============================================================= */

/* ---------- 1. NAVIGATION ----------
   Every nav button (side nav + bottom nav) has a
   data-screen="dashboard" (etc) attribute. Clicking one shows the
   matching <section id="screen-dashboard"> and hides the rest. */

function initNavigation() {
  const navButtons = document.querySelectorAll('[data-screen]');
  const screens = document.querySelectorAll('.screen');

  function showScreen(screenName) {
    // Hide every screen, then show only the one that was requested.
    screens.forEach(function (screen) {
      const isMatch = screen.id === 'screen-' + screenName;
      screen.classList.toggle('is-active', isMatch);
    });

    // Highlight the matching nav button in BOTH the side nav and
    // the bottom nav (a screen can be reached from either).
    navButtons.forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.screen === screenName);
    });

    // Keep the browser's back/forward buttons and page refresh
    // working sensibly by remembering the current screen.
    window.location.hash = screenName;
  }

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      showScreen(btn.dataset.screen);
    });
  });

  // On load: open whichever screen is in the URL hash (if valid),
  // otherwise default to the Dashboard.
  const requested = window.location.hash.replace('#', '');
  const validScreens = Array.from(screens).map(function (s) {
    return s.id.replace('screen-', '');
  });
  showScreen(validScreens.includes(requested) ? requested : 'dashboard');
}

/* ---------- 2. DATA LAYER (localStorage wrapper) ----------
   Every other part of the app reads/writes data ONLY through these
   functions — never touches localStorage directly. That means if
   Wealth360 ever moves to a real database, only this section needs
   to change; nothing else in the app does. */

const STORAGE_KEYS = {
  assets: 'wealth360_assets',
  institutions: 'wealth360_institutions',   // user-added institutions only
  snapshots: 'wealth360_snapshots',
  settings: 'wealth360_settings'
};

// Save any JS value under a key. Returns true on success.
function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('Wealth360: failed to save "' + key + '"', err);
    return false;
  }
}

// Load a value back out. If it's missing or corrupted (e.g. the
// browser storage got messed with by hand), quietly fall back to
// `fallback` instead of crashing the app.
function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Wealth360: corrupted data for "' + key + '", using fallback', err);
    return fallback;
  }
}

// Remove one key entirely.
function deleteData(key) {
  localStorage.removeItem(key);
}

// Convenience: load an array/object, run `updaterFn` on it, save
// the result. Used for "add one asset to the list" type operations.
function updateData(key, fallback, updaterFn) {
  const current = loadData(key, fallback);
  const updated = updaterFn(current);
  saveData(key, updated);
  return updated;
}

// Simple unique ID generator — good enough for a local prototype.
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- 3. INSTITUTION MASTER ----------
   ONE central list. Every form's institution dropdown reads from
   here, so adding a bank in the future only means editing this
   array, not hunting through every form in the app. */

const BUILT_IN_INSTITUTIONS = [
  // Public Sector Banks
  { id: 'sbi', name: 'State Bank of India', category: 'Public Sector Bank' },
  { id: 'bob', name: 'Bank of Baroda', category: 'Public Sector Bank' },
  { id: 'boi', name: 'Bank of India', category: 'Public Sector Bank' },
  { id: 'bom', name: 'Bank of Maharashtra', category: 'Public Sector Bank' },
  { id: 'canara', name: 'Canara Bank', category: 'Public Sector Bank' },
  { id: 'central-bank', name: 'Central Bank of India', category: 'Public Sector Bank' },
  { id: 'indian-bank', name: 'Indian Bank', category: 'Public Sector Bank' },
  { id: 'iob', name: 'Indian Overseas Bank', category: 'Public Sector Bank' },
  { id: 'pnb', name: 'Punjab National Bank', category: 'Public Sector Bank' },
  { id: 'psb', name: 'Punjab & Sind Bank', category: 'Public Sector Bank' },
  { id: 'uco', name: 'UCO Bank', category: 'Public Sector Bank' },
  { id: 'ubi', name: 'Union Bank of India', category: 'Public Sector Bank' },

  // Private Sector Banks
  { id: 'hdfc', name: 'HDFC Bank', category: 'Private Sector Bank' },
  { id: 'icici', name: 'ICICI Bank', category: 'Private Sector Bank' },
  { id: 'axis', name: 'Axis Bank', category: 'Private Sector Bank' },
  { id: 'kotak', name: 'Kotak Mahindra Bank', category: 'Private Sector Bank' },
  { id: 'indusind', name: 'IndusInd Bank', category: 'Private Sector Bank' },
  { id: 'idfc-first', name: 'IDFC FIRST Bank', category: 'Private Sector Bank' },
  { id: 'federal', name: 'Federal Bank', category: 'Private Sector Bank' },
  { id: 'yes', name: 'Yes Bank', category: 'Private Sector Bank' },
  { id: 'rbl', name: 'RBL Bank', category: 'Private Sector Bank' },
  { id: 'bandhan', name: 'Bandhan Bank', category: 'Private Sector Bank' },
  { id: 'csb', name: 'CSB Bank', category: 'Private Sector Bank' },
  { id: 'city-union', name: 'City Union Bank', category: 'Private Sector Bank' },
  { id: 'dcb', name: 'DCB Bank', category: 'Private Sector Bank' },
  { id: 'dhanlaxmi', name: 'Dhanlaxmi Bank', category: 'Private Sector Bank' },
  { id: 'jk-bank', name: 'Jammu & Kashmir Bank', category: 'Private Sector Bank' },
  { id: 'karnataka-bank', name: 'Karnataka Bank', category: 'Private Sector Bank' },
  { id: 'kvb', name: 'Karur Vysya Bank', category: 'Private Sector Bank' },
  { id: 'south-indian', name: 'South Indian Bank', category: 'Private Sector Bank' },
  { id: 'tmb', name: 'Tamilnad Mercantile Bank', category: 'Private Sector Bank' },
  { id: 'nainital', name: 'Nainital Bank', category: 'Private Sector Bank' },
  { id: 'idbi', name: 'IDBI Bank', category: 'Private Sector Bank' },

  // Small Finance / Regional Rural / Payments Banks (representative)
  { id: 'au-sfb', name: 'AU Small Finance Bank', category: 'Small Finance Bank' },
  { id: 'equitas-sfb', name: 'Equitas Small Finance Bank', category: 'Small Finance Bank' },
  { id: 'ujjivan-sfb', name: 'Ujjivan Small Finance Bank', category: 'Small Finance Bank' },
  { id: 'rrb-generic', name: 'Regional Rural Bank', category: 'Regional Rural Bank' },
  { id: 'airtel-payments', name: 'Airtel Payments Bank', category: 'Payments Bank' },
  { id: 'india-post-payments', name: 'India Post Payments Bank', category: 'Payments Bank' },

  // Other institutions
  { id: 'india-post', name: 'India Post', category: 'Government / Post' },
  { id: 'lic', name: 'LIC', category: 'Insurance' },
  { id: 'rbi', name: 'RBI', category: 'Government / Post' },
  { id: 'other', name: 'Other Institution', category: 'Other' }
];

// Returns built-in institutions + any the user has added, combined.
function getAllInstitutions() {
  const userAdded = loadData(STORAGE_KEYS.institutions, []);
  return BUILT_IN_INSTITUTIONS.concat(userAdded);
}

// User picks "+ Add New Institution" and types a name.
function addCustomInstitution(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const newInstitution = {
    id: 'custom-' + generateId(),
    name: trimmed,
    category: 'Custom'
  };

  updateData(STORAGE_KEYS.institutions, [], function (list) {
    list.push(newInstitution);
    return list;
  });

  return newInstitution;
}

// Case-insensitive search across all institutions — powers the
// searchable institution picker in the Add Asset screen (Stage 4).
function searchInstitutions(query) {
  const q = query.trim().toLowerCase();
  if (!q) return getAllInstitutions();
  return getAllInstitutions().filter(function (inst) {
    return inst.name.toLowerCase().includes(q);
  });
}

/* ---------- 4. CURRENCY FORMATTING ----------
   One reusable function so every screen displays money the same
   way: Indian digit grouping with a ₹ symbol. */
function formatCurrency(amount) {
  const number = Number(amount) || 0;
  const formatted = number.toLocaleString('en-IN', {
    maximumFractionDigits: 0
  });
  return '₹' + formatted;
}

/* ---------- 5. DEMO DATA ----------
   Realistic, clearly-fictional sample assets covering all 14 asset
   types, so the app never opens empty and you can see the whole
   product working end to end. */

function buildDemoAssets() {
  return [
    {
      id: generateId(), type: 'savings', institution: 'State Bank of India',
      accountNumber: 'XXXX-4821', currentBalance: 185000, date: '2026-08-01',
      notes: 'Primary salary account'
    },
    {
      id: generateId(), type: 'savings', institution: 'HDFC Bank',
      accountNumber: 'XXXX-1190', currentBalance: 62000, date: '2026-08-01',
      notes: 'Joint household account'
    },
    {
      id: generateId(), type: 'shares', institution: 'Zerodha',
      company: 'Reliance Industries', quantity: 40, purchasePrice: 2450,
      purchaseDate: '2023-04-12', currentValue: 118000, notes: ''
    },
    {
      id: generateId(), type: 'mutual_fund', institution: 'HDFC Mutual Fund',
      fundName: 'HDFC Flexi Cap Fund', investmentAmount: 300000,
      currentValue: 412000, investmentDate: '2022-01-15', notes: 'SIP, monthly'
    },
    {
      id: generateId(), type: 'fd', institution: 'ICICI Bank',
      investmentAmount: 500000, investmentDate: '2024-06-01', interestRate: 7.1,
      tenureMonths: 36, compounding: 'Quarterly', maturityDate: '2027-06-01',
      maturityValueEntered: null
    },
    {
      id: generateId(), type: 'rd', institution: 'Punjab National Bank',
      monthlyDeposit: 10000, startDate: '2025-01-05', tenureMonths: 24,
      interestRate: 6.8, maturityDate: '2027-01-05', maturityValueEntered: null
    },
    {
      id: generateId(), type: 'epf', institution: 'EPFO',
      currentBalance: 620000, contribution: 7200, interestRate: 8.25,
      currentValue: 620000, notes: 'Via employer'
    },
    {
      id: generateId(), type: 'ppf', institution: 'State Bank of India',
      openingDate: '2016-04-01', currentValue: 890000, contributions: 150000,
      interestRate: 7.1, maturityDate: '2031-04-01', maturityValueEntered: null
    },
    {
      id: generateId(), type: 'nps', institution: 'HDFC Pension Fund',
      currentValue: 275000, contribution: 5000, investmentDate: '2021-07-01',
      notes: 'Tier I'
    },
    {
      id: generateId(), type: 'ssy', institution: 'India Post',
      openingDate: '2019-02-10', deposits: 300000, currentBalance: 365000,
      interestRate: 8.2, maturityDate: '2040-02-10', maturityValueEntered: null
    },
    {
      id: generateId(), type: 'lic', institution: 'LIC',
      policyName: 'Jeevan Anand', policyNumber: 'LIC-772XXXXX', premium: 24000,
      premiumFrequency: 'Yearly', startDate: '2015-03-20', maturityDate: '2035-03-20',
      maturityValueEntered: 1200000, currentValue: 340000
    },
    {
      id: generateId(), type: 'bond', institution: 'RBI',
      bondName: 'Sovereign Gold Bond 2023-24 Series II', investmentAmount: 118000,
      investmentDate: '2023-09-11', interestRate: 2.5, maturityDate: '2031-09-11',
      maturityValueEntered: null
    },
    {
      id: generateId(), type: 'gold', weight: 45, weightUnit: 'grams',
      purchaseDate: '2021-11-04', purchasePrice: 4850, currentPrice: 7350
    },
    {
      id: generateId(), type: 'silver', weight: 1.2, weightUnit: 'kilograms',
      purchaseDate: '2022-08-19', purchasePrice: 62000, currentPrice: 91000
    },
    {
      id: generateId(), type: 'other', institution: 'Other Institution',
      assetName: 'Company ESOP Pool', investmentAmount: 0, investmentDate: '2022-01-01',
      currentValue: 210000, interestRate: null, maturityDate: null,
      maturityValueEntered: null, notes: 'Vested shares, private valuation'
    }
  ];
}

function loadDemoData() {
  saveData(STORAGE_KEYS.assets, buildDemoAssets());
  updateData(STORAGE_KEYS.settings, {}, function (settings) {
    settings.demoMode = true;
    return settings;
  });
}

function clearAllData() {
  deleteData(STORAGE_KEYS.assets);
  deleteData(STORAGE_KEYS.institutions);
  deleteData(STORAGE_KEYS.snapshots);
  updateData(STORAGE_KEYS.settings, {}, function (settings) {
    settings.demoMode = false;
    return settings;
  });
}

/* ---------- 6. SETTINGS SCREEN WIRING (temporary test harness) ----------
   The real Settings screen UI comes in Stage 9. For now this just
   proves the data layer above actually works, by showing what's in
   localStorage and letting you load/clear demo data. */

function renderDataSummary() {
  const summaryEl = document.getElementById('dataSummary');
  if (!summaryEl) return;

  const assets = loadData(STORAGE_KEYS.assets, []);
  const userInstitutions = loadData(STORAGE_KEYS.institutions, []);
  const settings = loadData(STORAGE_KEYS.settings, {});

  // Quick rough total just to sanity-check numbers are saving
  // correctly. The real corpus calculation engine arrives in Stage 6.
  let roughTotal = 0;
  assets.forEach(function (asset) {
    if (typeof asset.currentValue === 'number') roughTotal += asset.currentValue;
    if (typeof asset.currentBalance === 'number') roughTotal += asset.currentBalance;
    if (asset.type === 'gold' || asset.type === 'silver') {
      const grams = asset.weightUnit === 'kilograms' ? asset.weight * 1000
        : asset.weightUnit === 'ounces' ? asset.weight * 31.1035
        : asset.weight;
      roughTotal += grams * asset.currentPrice;
    }
  });

  summaryEl.innerHTML =
    '<div><strong>Assets stored:</strong> ' + assets.length + '</div>' +
    '<div><strong>Custom institutions:</strong> ' + userInstitutions.length + '</div>' +
    '<div><strong>Demo mode:</strong> ' + (settings.demoMode ? 'On' : 'Off') + '</div>' +
    '<div><strong>Rough total (sanity check only):</strong> ' + formatCurrency(roughTotal) + '</div>';
}

function initSettingsScreen() {
  const loadBtn = document.getElementById('btnLoadDemo');
  const clearBtn = document.getElementById('btnClearData');

  if (loadBtn) {
    loadBtn.addEventListener('click', function () {
      loadDemoData();
      renderDataSummary();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      const confirmed = window.confirm('This will permanently delete all assets, custom institutions, and snapshots stored in this browser. Continue?');
      if (!confirmed) return;
      clearAllData();
      renderDataSummary();
    });
  }

  renderDataSummary();
}

/* ---------- APP START ---------- */
document.addEventListener('DOMContentLoaded', function () {
  initNavigation();
  initSettingsScreen();
});
