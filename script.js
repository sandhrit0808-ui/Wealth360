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

    // Screens that show live data re-render every time they're
    // opened, in case data changed elsewhere (e.g. Settings).
    if (screenName === 'dashboard') renderDashboard();
  }

  // Make navigation available outside this function too — Quick
  // Action buttons on the Dashboard use this to jump to other
  // screens without duplicating the nav logic.
  window.navigateToScreen = showScreen;

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      showScreen(btn.dataset.screen);
    });
  });

  // Quick Action buttons (and any future button) use
  // data-navigate="screen-name" instead of data-screen, so they
  // don't get treated as nav-highlight buttons.
  document.querySelectorAll('[data-navigate]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showScreen(btn.dataset.navigate);
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
      renderDashboard();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      const confirmed = window.confirm('This will permanently delete all assets, custom institutions, and snapshots stored in this browser. Continue?');
      if (!confirmed) return;
      clearAllData();
      renderDataSummary();
      renderDashboard();
    });
  }

  renderDataSummary();
}

/* ---------- 6b. DASHBOARD CALCULATIONS & RENDERING ----------
   NOTE: getAssetCurrentValue() below is a BASIC estimate so the
   Dashboard has real numbers to show. The full deterministic
   calculation engine (separate function per product, e.g.
   calculateFDMaturity) is built in Stage 6. For products that
   don't have a live "current value" yet (FD, RD, Sovereign Bonds),
   this uses the invested amount as a placeholder and flags it. */

const TYPE_LABELS = {
  savings: 'Savings Account',
  shares: 'Shares',
  mutual_fund: 'Mutual Funds',
  fd: 'Fixed Deposit',
  rd: 'Recurring Deposit',
  epf: 'EPF',
  ppf: 'PPF',
  nps: 'NPS',
  ssy: 'Sukanya Samriddhi',
  lic: 'LIC',
  bond: 'Sovereign Bonds',
  gold: 'Gold',
  silver: 'Silver',
  other: 'Other'
};

const ALLOCATION_COLORS = [
  '#146356', '#B98A2E', '#4B5C55', '#6E8F87', '#C77B4E',
  '#3E6E8E', '#8E6E9A', '#A3752B', '#5C7A5A', '#8A5A4E',
  '#5A7A8A', '#9A8A5A', '#7A5A8A', '#5A8A6E'
];

function gramsFromWeight(weight, unit) {
  if (unit === 'kilograms') return weight * 1000;
  if (unit === 'ounces') return weight * 31.1035;
  return weight; // grams (default)
}

// Returns { value, isEstimate }. isEstimate = true means this
// number is a stand-in (invested amount) until Stage 6's real
// calculation engine can compute an actual current value.
function getAssetCurrentValue(asset) {
  switch (asset.type) {
    case 'savings': return { value: asset.currentBalance || 0, isEstimate: false };
    case 'shares': return { value: asset.currentValue || 0, isEstimate: false };
    case 'mutual_fund': return { value: asset.currentValue || 0, isEstimate: false };
    case 'epf': return { value: asset.currentValue || asset.currentBalance || 0, isEstimate: false };
    case 'ppf': return { value: asset.currentValue || 0, isEstimate: false };
    case 'nps': return { value: asset.currentValue || 0, isEstimate: false };
    case 'ssy': return { value: asset.currentBalance || 0, isEstimate: false };
    case 'lic': return { value: asset.currentValue || 0, isEstimate: !asset.currentValue };
    case 'other': return { value: asset.currentValue || 0, isEstimate: false };
    case 'fd': return { value: asset.investmentAmount || 0, isEstimate: true };
    case 'rd': return { value: (asset.monthlyDeposit || 0) * (asset.tenureMonths || 0), isEstimate: true };
    case 'bond': return { value: asset.investmentAmount || 0, isEstimate: true };
    case 'gold':
    case 'silver': {
      const grams = gramsFromWeight(asset.weight || 0, asset.weightUnit);
      return { value: grams * (asset.currentPrice || 0), isEstimate: false };
    }
    default: return { value: 0, isEstimate: true };
  }
}

function renderDashboard() {
  const totalEl = document.getElementById('totalCorpusValue');
  if (!totalEl) return; // dashboard markup not present yet

  const assets = loadData(STORAGE_KEYS.assets, []);

  let totalCorpus = 0;
  let hasEstimates = false;
  const byType = {};        // type -> total value
  const byInstitution = {}; // institution -> total value

  assets.forEach(function (asset) {
    const result = getAssetCurrentValue(asset);
    totalCorpus += result.value;
    if (result.isEstimate) hasEstimates = true;

    byType[asset.type] = (byType[asset.type] || 0) + result.value;

    const inst = asset.institution || 'Physical Holding';
    byInstitution[inst] = (byInstitution[inst] || 0) + result.value;
  });

  // ---- Total corpus ----
  totalEl.textContent = formatCurrency(totalCorpus);
  const noteEl = document.getElementById('corpusIncompleteNote');
  if (assets.length === 0) {
    noteEl.textContent = 'No assets yet — load demo data or add your first asset to see your corpus.';
  } else if (hasEstimates) {
    noteEl.textContent = 'Corpus may be incomplete: FD, RD and Bond values shown are invested amounts until the maturity calculation engine is built (Stage 6).';
  } else {
    noteEl.textContent = '';
  }

  // ---- Asset allocation donut ----
  renderAllocationDonut(byType, totalCorpus);

  // ---- Corpus by institution ----
  renderInstitutionList(byInstitution);
}

function renderAllocationDonut(byType, totalCorpus) {
  const svg = document.getElementById('allocationDonut');
  const legend = document.getElementById('allocationLegend');
  if (!svg || !legend) return;

  svg.innerHTML = '';
  legend.innerHTML = '';

  const types = Object.keys(byType).filter(function (t) { return byType[t] > 0; });

  if (types.length === 0 || totalCorpus <= 0) {
    legend.innerHTML = '<li class="allocation__empty-state">Add assets to see your allocation breakdown.</li>';
    return;
  }

  const radius = 80;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  let offsetSoFar = 0;

  types.forEach(function (type, index) {
    const value = byType[type];
    const fraction = value / totalCorpus;
    const dash = fraction * circumference;
    const color = ALLOCATION_COLORS[index % ALLOCATION_COLORS.length];

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '100');
    circle.setAttribute('cy', '100');
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', strokeWidth);
    circle.setAttribute('stroke-dasharray', dash + ' ' + (circumference - dash));
    circle.setAttribute('stroke-dashoffset', -offsetSoFar);
    svg.appendChild(circle);

    offsetSoFar += dash;

    const li = document.createElement('li');
    li.innerHTML =
      '<span class="allocation__swatch" style="background:' + color + '"></span>' +
      '<span class="allocation__legend-name">' + (TYPE_LABELS[type] || type) + '</span>' +
      '<span class="allocation__legend-value">' + formatCurrency(value) + '</span>';
    legend.appendChild(li);
  });
}

function renderInstitutionList(byInstitution, sortDirection) {
  const list = document.getElementById('institutionList');
  if (!list) return;

  const entries = Object.keys(byInstitution).map(function (name) {
    return { name: name, value: byInstitution[name] };
  });

  entries.sort(function (a, b) {
    return sortDirection === 'asc' ? a.value - b.value : b.value - a.value;
  });

  if (entries.length === 0) {
    list.innerHTML = '<li class="allocation__empty-state">No institutions yet.</li>';
    return;
  }

  const maxValue = Math.max.apply(null, entries.map(function (e) { return e.value; }));

  list.innerHTML = entries.map(function (entry) {
    const barPercent = maxValue > 0 ? Math.round((entry.value / maxValue) * 100) : 0;
    return (
      '<li>' +
        '<span class="institution-list__name">' + entry.name + '</span>' +
        '<span class="institution-list__value">' + formatCurrency(entry.value) + '</span>' +
        '<span class="institution-list__bar-track"><span class="institution-list__bar-fill" style="width:' + barPercent + '%"></span></span>' +
      '</li>'
    );
  }).join('');
}

function initDashboardSort() {
  const sortBtn = document.getElementById('btnSortInstitutions');
  if (!sortBtn) return;

  let currentDirection = 'desc';

  sortBtn.addEventListener('click', function () {
    currentDirection = currentDirection === 'desc' ? 'asc' : 'desc';
    sortBtn.textContent = currentDirection === 'desc' ? 'Highest → Lowest' : 'Lowest → Highest';

    const assets = loadData(STORAGE_KEYS.assets, []);
    const byInstitution = {};
    assets.forEach(function (asset) {
      const result = getAssetCurrentValue(asset);
      const inst = asset.institution || 'Physical Holding';
      byInstitution[inst] = (byInstitution[inst] || 0) + result.value;
    });

    renderInstitutionList(byInstitution, currentDirection);
  });
}

/* ---------- 7. CALCULATION ENGINE (Stage 5) ----------
   One deterministic function per financial product — never a
   single generic formula reused everywhere. Every function returns
   a plain number (rounded rupees) and never guesses: if it's
   called, its caller has already checked the required inputs
   exist. No AI, no randomness — same inputs always give the same
   answer. */

const COMPOUNDING_PERIODS_PER_YEAR = {
  'Monthly': 12,
  'Quarterly': 4,
  'Half-Yearly': 2,
  'Yearly': 1
};

// Fixed Deposit: standard compound interest, compounded at the
// frequency the user picked.
function calculateFDMaturity(principal, annualRatePercent, tenureMonths, compoundingFrequency) {
  const n = COMPOUNDING_PERIODS_PER_YEAR[compoundingFrequency] || 4;
  const r = annualRatePercent / 100;
  const t = tenureMonths / 12;
  const maturity = principal * Math.pow(1 + r / n, n * t);
  return Math.round(maturity);
}

// Recurring Deposit: future value of a monthly annuity-due,
// compounded monthly. Deliberately NOT the FD formula — an RD is a
// stream of monthly deposits, not a single lump sum.
function calculateRDMaturity(monthlyDeposit, annualRatePercent, tenureMonths) {
  const r = annualRatePercent / 100 / 12; // monthly rate
  if (r === 0) return Math.round(monthlyDeposit * tenureMonths);
  const maturity = monthlyDeposit * ((Math.pow(1 + r, tenureMonths) - 1) / r) * (1 + r);
  return Math.round(maturity);
}

// PPF: existing balance grows annually, PLUS a yearly contribution
// annuity (deposits assumed made at the start of each PPF year, as
// is standard practice for getting the full year's interest).
function calculatePPFMaturity(currentValue, annualContribution, annualRatePercent, yearsRemaining) {
  const r = annualRatePercent / 100;
  const fvCurrent = currentValue * Math.pow(1 + r, yearsRemaining);
  const fvContributions = r === 0
    ? annualContribution * yearsRemaining
    : annualContribution * ((Math.pow(1 + r, yearsRemaining) - 1) / r) * (1 + r);
  return Math.round(fvCurrent + fvContributions);
}

// Sukanya Samriddhi Yojana: kept as its own function (not reused
// from PPF) because SSY's contribution pattern and tenure rules
// differ. This prototype grows the existing balance forward at the
// given rate to the maturity date — it does not assume new deposits,
// since the data model doesn't collect an ongoing annual SSY deposit.
function calculateSSYMaturity(currentBalance, annualRatePercent, yearsRemaining) {
  const r = annualRatePercent / 100;
  const maturity = currentBalance * Math.pow(1 + r, yearsRemaining);
  return Math.round(maturity);
}

// Sovereign Bonds: simple (non-compounded) annual interest on the
// principal, paid out over the bond's tenure — the standard
// structure for instruments like Sovereign Gold Bonds.
function calculateBondMaturity(investmentAmount, annualRatePercent, tenureYears) {
  const totalInterest = investmentAmount * (annualRatePercent / 100) * tenureYears;
  return Math.round(investmentAmount + totalInterest);
}

// Shared helper: years between two ISO date strings (can be
// fractional). Used to turn a maturity date into "years remaining"
// for PPF/SSY/Bond calculations.
function yearsBetweenDates(fromDateStr, toDateStr) {
  const from = new Date(fromDateStr);
  const to = new Date(toDateStr);
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  return (to - from) / msPerYear;
}

/* ---------- 8. ASSET FIELD CONFIGURATIONS (Stage 4) ----------
   ONE config array per asset type — the form renderer below reads
   this and builds the right fields automatically. To change what a
   form asks for, edit the config here; nothing else needs to change. */

const ASSET_TYPES = [
  { id: 'savings', label: 'Savings Account', icon: '◆' },
  { id: 'shares', label: 'Shares', icon: '▲' },
  { id: 'mutual_fund', label: 'Mutual Funds', icon: '◍' },
  { id: 'fd', label: 'Fixed Deposit', icon: '▣' },
  { id: 'rd', label: 'Recurring Deposit', icon: '↻' },
  { id: 'epf', label: 'EPF', icon: '⛁' },
  { id: 'ppf', label: 'PPF', icon: '⛀' },
  { id: 'nps', label: 'NPS', icon: '◉' },
  { id: 'ssy', label: 'Sukanya Samriddhi', icon: '✦' },
  { id: 'lic', label: 'LIC', icon: '⛨' },
  { id: 'bond', label: 'Sovereign Bonds', icon: '◈' },
  { id: 'gold', label: 'Gold - Physical', icon: '●' },
  { id: 'silver', label: 'Silver - Physical', icon: '○' },
  { id: 'other', label: 'Other', icon: '＋' }
];

const WEIGHT_UNIT_OPTIONS = ['grams', 'kilograms', 'ounces'];
const COMPOUNDING_OPTIONS = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
const FREQUENCY_OPTIONS = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];

const ASSET_FIELD_CONFIGS = {
  savings: [
    { key: 'institution', label: 'Institution', kind: 'institution', required: true },
    { key: 'accountNumber', label: 'Account / Reference Number', kind: 'text', required: true },
    { key: 'currentBalance', label: 'Current Balance (₹)', kind: 'number', required: true, min: 0 },
    { key: 'date', label: 'As Of Date', kind: 'date', required: true },
    { key: 'notes', label: 'Notes', kind: 'textarea', required: false }
  ],
  shares: [
    { key: 'institution', label: 'Institution / Broker', kind: 'institution', required: true },
    { key: 'company', label: 'Company', kind: 'text', required: true },
    { key: 'quantity', label: 'Quantity', kind: 'number', required: true, min: 0 },
    { key: 'purchasePrice', label: 'Purchase Price (₹ per share)', kind: 'number', required: true, min: 0 },
    { key: 'purchaseDate', label: 'Purchase Date', kind: 'date', required: true },
    { key: 'currentValue', label: 'Current Value (₹)', kind: 'number', required: true, min: 0 },
    { key: 'notes', label: 'Notes', kind: 'textarea', required: false }
  ],
  mutual_fund: [
    { key: 'institution', label: 'Institution / AMC', kind: 'institution', required: true },
    { key: 'fundName', label: 'Fund Name', kind: 'text', required: true },
    { key: 'investmentAmount', label: 'Investment Amount (₹)', kind: 'number', required: true, min: 0 },
    { key: 'currentValue', label: 'Current Value (₹)', kind: 'number', required: true, min: 0 },
    { key: 'investmentDate', label: 'Investment Date', kind: 'date', required: true },
    { key: 'notes', label: 'Notes', kind: 'textarea', required: false }
  ],
  fd: [
    { key: 'institution', label: 'Institution', kind: 'institution', required: true },
    { key: 'investmentAmount', label: 'Investment Amount (₹)', kind: 'number', required: true, min: 0 },
    { key: 'investmentDate', label: 'Investment Date', kind: 'date', required: true },
    { key: 'interestRate', label: 'Interest Rate (% p.a.)', kind: 'number', required: true, min: 0, step: 0.01 },
    { key: 'tenureMonths', label: 'Tenure (months)', kind: 'number', required: true, min: 1 },
    { key: 'compounding', label: 'Compounding Frequency', kind: 'select', required: true, options: COMPOUNDING_OPTIONS },
    { key: 'maturityDate', label: 'Maturity Date', kind: 'date', required: false, hint: 'Leave blank and we\u2019ll estimate it from the investment date and tenure.' },
    { key: 'maturityValueEntered', label: 'Your Entered Maturity Value (₹, optional)', kind: 'number', required: false, min: 0 }
  ],
  rd: [
    { key: 'institution', label: 'Institution', kind: 'institution', required: true },
    { key: 'monthlyDeposit', label: 'Monthly Deposit (₹)', kind: 'number', required: true, min: 0 },
    { key: 'startDate', label: 'Start Date', kind: 'date', required: true },
    { key: 'tenureMonths', label: 'Tenure (months)', kind: 'number', required: true, min: 1 },
    { key: 'interestRate', label: 'Interest Rate (% p.a.)', kind: 'number', required: true, min: 0, step: 0.01 },
    { key: 'maturityDate', label: 'Maturity Date', kind: 'date', required: false },
    { key: 'maturityValueEntered', label: 'Your Entered Maturity Value (₹, optional)', kind: 'number', required: false, min: 0 }
  ],
  epf: [
    { key: 'institution', label: 'Institution (EPFO / Trust)', kind: 'institution', required: true },
    { key: 'currentBalance', label: 'Current Balance (₹)', kind: 'number', required: true, min: 0 },
    { key: 'contribution', label: 'Monthly Contribution (₹)', kind: 'number', required: false, min: 0 },
    { key: 'interestRate', label: 'Interest Rate (% p.a., if known)', kind: 'number', required: false, min: 0, step: 0.01 },
    { key: 'notes', label: 'Notes', kind: 'textarea', required: false }
  ],
  ppf: [
    { key: 'institution', label: 'Institution', kind: 'institution', required: true },
    { key: 'openingDate', label: 'Opening Date', kind: 'date', required: true },
    { key: 'currentValue', label: 'Current Value (₹)', kind: 'number', required: true, min: 0 },
    { key: 'contributions', label: 'Annual Contribution (₹, optional)', kind: 'number', required: false, min: 0 },
    { key: 'interestRate', label: 'Interest Rate (% p.a.)', kind: 'number', required: true, min: 0, step: 0.01 },
    { key: 'maturityDate', label: 'Maturity Date', kind: 'date', required: true },
    { key: 'maturityValueEntered', label: 'Your Entered Maturity Value (₹, optional)', kind: 'number', required: false, min: 0 }
  ],
  nps: [
    { key: 'institution', label: 'Institution / Provider', kind: 'institution', required: true },
    { key: 'currentValue', label: 'Current Value (₹)', kind: 'number', required: true, min: 0 },
    { key: 'contribution', label: 'Monthly Contribution (₹, optional)', kind: 'number', required: false, min: 0 },
    { key: 'investmentDate', label: 'Investment Date', kind: 'date', required: true },
    { key: 'notes', label: 'Notes', kind: 'textarea', required: false }
  ],
  ssy: [
    { key: 'institution', label: 'Institution', kind: 'institution', required: true },
    { key: 'openingDate', label: 'Account Opening Date', kind: 'date', required: true },
    { key: 'deposits', label: 'Total Deposits So Far (₹, optional)', kind: 'number', required: false, min: 0 },
    { key: 'currentBalance', label: 'Current Balance (₹)', kind: 'number', required: true, min: 0 },
    { key: 'interestRate', label: 'Interest Rate (% p.a.)', kind: 'number', required: true, min: 0, step: 0.01 },
    { key: 'maturityDate', label: 'Maturity Date', kind: 'date', required: true },
    { key: 'maturityValueEntered', label: 'Your Entered Maturity Value (₹, optional)', kind: 'number', required: false, min: 0 }
  ],
  lic: [
    { key: 'institution', label: 'Institution', kind: 'institution', required: true },
    { key: 'policyName', label: 'Policy Name', kind: 'text', required: true },
    { key: 'policyNumber', label: 'Policy Number / Reference', kind: 'text', required: true },
    { key: 'premium', label: 'Premium (₹)', kind: 'number', required: true, min: 0 },
    { key: 'premiumFrequency', label: 'Premium Frequency', kind: 'select', required: true, options: FREQUENCY_OPTIONS },
    { key: 'startDate', label: 'Policy Start Date', kind: 'date', required: true },
    { key: 'maturityDate', label: 'Maturity Date', kind: 'date', required: true },
    { key: 'maturityValueEntered', label: 'Maturity Value (₹, if known)', kind: 'number', required: false, min: 0 },
    { key: 'currentValue', label: 'Current Value (₹, if known)', kind: 'number', required: false, min: 0 }
  ],
  bond: [
    { key: 'institution', label: 'Institution', kind: 'institution', required: true },
    { key: 'bondName', label: 'Bond Name', kind: 'text', required: true },
    { key: 'investmentAmount', label: 'Investment Amount (₹)', kind: 'number', required: true, min: 0 },
    { key: 'investmentDate', label: 'Investment Date', kind: 'date', required: true },
    { key: 'interestRate', label: 'Interest Rate (% p.a.)', kind: 'number', required: true, min: 0, step: 0.01 },
    { key: 'maturityDate', label: 'Maturity Date', kind: 'date', required: true },
    { key: 'maturityValueEntered', label: 'Your Entered Maturity Value (₹, optional)', kind: 'number', required: false, min: 0 }
  ],
  gold: [
    { key: 'weight', label: 'Weight', kind: 'number', required: true, min: 0 },
    { key: 'weightUnit', label: 'Weight Unit', kind: 'select', required: true, options: WEIGHT_UNIT_OPTIONS, default: 'grams' },
    { key: 'purchaseDate', label: 'Purchase Date', kind: 'date', required: true },
    { key: 'purchasePrice', label: 'Purchase Price (₹ per unit)', kind: 'number', required: true, min: 0 },
    { key: 'currentPrice', label: 'Current Market Price (₹ per unit)', kind: 'number', required: true, min: 0 }
  ],
  silver: [
    { key: 'weight', label: 'Weight', kind: 'number', required: true, min: 0 },
    { key: 'weightUnit', label: 'Weight Unit', kind: 'select', required: true, options: WEIGHT_UNIT_OPTIONS, default: 'grams' },
    { key: 'purchaseDate', label: 'Purchase Date', kind: 'date', required: true },
    { key: 'purchasePrice', label: 'Purchase Price (₹ per unit)', kind: 'number', required: true, min: 0 },
    { key: 'currentPrice', label: 'Current Market Price (₹ per unit)', kind: 'number', required: true, min: 0 }
  ],
  other: [
    { key: 'institution', label: 'Institution (optional)', kind: 'institution', required: false },
    { key: 'assetName', label: 'Asset Name', kind: 'text', required: true },
    { key: 'investmentAmount', label: 'Investment Amount (₹, optional)', kind: 'number', required: false, min: 0 },
    { key: 'investmentDate', label: 'Investment Date (optional)', kind: 'date', required: false },
    { key: 'currentValue', label: 'Current Value (₹)', kind: 'number', required: true, min: 0 },
    { key: 'interestRate', label: 'Interest Rate (% p.a., optional)', kind: 'number', required: false, min: 0, step: 0.01 },
    { key: 'maturityDate', label: 'Maturity Date (optional)', kind: 'date', required: false },
    { key: 'maturityValueEntered', label: 'Maturity Value (₹, optional)', kind: 'number', required: false, min: 0 },
    { key: 'notes', label: 'Notes', kind: 'textarea', required: false }
  ]
};

// Which date field marks the "start" for each type — used to check
// that a maturity date never falls before the asset's start date.
const START_DATE_FIELD = {
  fd: 'investmentDate', rd: 'startDate', ppf: 'openingDate',
  ssy: 'openingDate', lic: 'startDate', bond: 'investmentDate'
};

/* ---------- 9. ADD ASSET: FORM RENDERING ---------- */

let selectedAssetType = null;

function renderTypeGrid() {
  const grid = document.getElementById('typeGrid');
  if (!grid) return;

  grid.innerHTML = ASSET_TYPES.map(function (t) {
    return (
      '<button type="button" class="type-btn" data-type="' + t.id + '">' +
        '<span class="type-btn__icon">' + t.icon + '</span>' +
        '<span>' + t.label + '</span>' +
      '</button>'
    );
  }).join('');

  grid.querySelectorAll('.type-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectAssetType(btn.dataset.type);
    });
  });
}

function refreshInstitutionOptions() {
  const datalist = document.getElementById('institutionOptions');
  if (!datalist) return;
  datalist.innerHTML = getAllInstitutions().map(function (inst) {
    return '<option value="' + inst.name + '">';
  }).join('');
}

function buildFieldHTML(field) {
  const id = 'field_' + field.key;
  const requiredMark = field.required ? ' *' : '';
  const hint = field.hint ? '<span class="hint">' + field.hint + '</span>' : '';

  let inputHTML = '';

  if (field.kind === 'institution') {
    inputHTML = '<input type="text" id="' + id + '" list="institutionOptions" autocomplete="off">';
  } else if (field.kind === 'text') {
    inputHTML = '<input type="text" id="' + id + '">';
  } else if (field.kind === 'number') {
    const min = (field.min !== undefined) ? ' min="' + field.min + '"' : '';
    const step = field.step ? ' step="' + field.step + '"' : ' step="any"';
    inputHTML = '<input type="number" id="' + id + '"' + min + step + '>';
  } else if (field.kind === 'date') {
    inputHTML = '<input type="date" id="' + id + '">';
  } else if (field.kind === 'select') {
    const options = field.options.map(function (opt) {
      const selectedAttr = (field.default === opt) ? ' selected' : '';
      return '<option value="' + opt + '"' + selectedAttr + '>' + opt + '</option>';
    }).join('');
    inputHTML = '<select id="' + id + '">' + options + '</select>';
  } else if (field.kind === 'textarea') {
    inputHTML = '<textarea id="' + id + '"></textarea>';
  }

  return (
    '<div class="form-group">' +
      '<label for="' + id + '">' + field.label + requiredMark + '</label>' +
      inputHTML + hint +
    '</div>'
  );
}

function selectAssetType(typeId) {
  selectedAssetType = typeId;

  document.querySelectorAll('.type-btn').forEach(function (btn) {
    btn.classList.toggle('is-selected', btn.dataset.type === typeId);
  });

  const typeMeta = ASSET_TYPES.find(function (t) { return t.id === typeId; });
  document.getElementById('formTitle').textContent = '2. Enter ' + typeMeta.label + ' Details';

  const fields = ASSET_FIELD_CONFIGS[typeId];
  document.getElementById('dynamicFields').innerHTML = fields.map(buildFieldHTML).join('');

  document.getElementById('formCard').style.display = 'block';
  document.getElementById('formErrors').style.display = 'none';
  document.getElementById('successBanner').style.display = 'none';
  document.getElementById('assetForm').style.display = 'block';

  refreshInstitutionOptions();

  const previewBox = document.getElementById('calcPreview');
  if (CALC_PREVIEW_FNS[typeId]) {
    previewBox.style.display = 'block';
    document.getElementById('dynamicFields').addEventListener('input', function () {
      updateCalcPreview(typeId);
    });
    updateCalcPreview(typeId);
  } else {
    previewBox.style.display = 'none';
  }
}

/* ---------- 10. ADD ASSET: LIVE MATURITY PREVIEW ---------- */

function getFieldValue(key) {
  const el = document.getElementById('field_' + key);
  return el ? el.value : '';
}

function computeFDPreview() {
  const investmentAmount = Number(getFieldValue('investmentAmount'));
  const interestRate = Number(getFieldValue('interestRate'));
  const tenureMonths = Number(getFieldValue('tenureMonths'));
  const compounding = getFieldValue('compounding');

  if (!investmentAmount || !interestRate || !tenureMonths || !compounding) {
    return { value: null, message: 'Add investment amount, interest rate, tenure and compounding frequency to calculate estimated maturity value.' };
  }
  return { value: calculateFDMaturity(investmentAmount, interestRate, tenureMonths, compounding), message: null };
}

function computeRDPreview() {
  const monthlyDeposit = Number(getFieldValue('monthlyDeposit'));
  const interestRate = Number(getFieldValue('interestRate'));
  const tenureMonths = Number(getFieldValue('tenureMonths'));

  if (!monthlyDeposit || !interestRate || !tenureMonths) {
    return { value: null, message: 'Add monthly deposit, interest rate and tenure to calculate estimated maturity value.' };
  }
  return { value: calculateRDMaturity(monthlyDeposit, interestRate, tenureMonths), message: null };
}

function computePPFPreview() {
  const currentValue = Number(getFieldValue('currentValue'));
  const contributions = Number(getFieldValue('contributions')) || 0;
  const interestRate = Number(getFieldValue('interestRate'));
  const maturityDate = getFieldValue('maturityDate');

  if (!currentValue || !interestRate || !maturityDate) {
    return { value: null, message: 'Add current value, interest rate and maturity date to calculate estimated maturity value.' };
  }
  const yearsRemaining = yearsBetweenDates(new Date().toISOString().slice(0, 10), maturityDate);
  if (yearsRemaining <= 0) {
    return { value: null, message: 'Maturity date should be in the future to estimate a maturity value.' };
  }
  return { value: calculatePPFMaturity(currentValue, contributions, interestRate, yearsRemaining), message: null };
}

function computeSSYPreview() {
  const currentBalance = Number(getFieldValue('currentBalance'));
  const interestRate = Number(getFieldValue('interestRate'));
  const maturityDate = getFieldValue('maturityDate');

  if (!currentBalance || !interestRate || !maturityDate) {
    return { value: null, message: 'Add current balance, interest rate and maturity date to calculate estimated maturity value.' };
  }
  const yearsRemaining = yearsBetweenDates(new Date().toISOString().slice(0, 10), maturityDate);
  if (yearsRemaining <= 0) {
    return { value: null, message: 'Maturity date should be in the future to estimate a maturity value.' };
  }
  return { value: calculateSSYMaturity(currentBalance, interestRate, yearsRemaining), message: null };
}

function computeBondPreview() {
  const investmentAmount = Number(getFieldValue('investmentAmount'));
  const interestRate = Number(getFieldValue('interestRate'));
  const investmentDate = getFieldValue('investmentDate');
  const maturityDate = getFieldValue('maturityDate');

  if (!investmentAmount || !interestRate || !investmentDate || !maturityDate) {
    return { value: null, message: 'Add investment amount, interest rate, investment date and maturity date to calculate estimated maturity value.' };
  }
  const tenureYears = yearsBetweenDates(investmentDate, maturityDate);
  if (tenureYears <= 0) {
    return { value: null, message: 'Maturity date should be after the investment date to estimate a maturity value.' };
  }
  return { value: calculateBondMaturity(investmentAmount, interestRate, tenureYears), message: null };
}

const CALC_PREVIEW_FNS = {
  fd: computeFDPreview,
  rd: computeRDPreview,
  ppf: computePPFPreview,
  ssy: computeSSYPreview,
  bond: computeBondPreview
};

function updateCalcPreview(typeId) {
  const box = document.getElementById('calcPreview');
  const fn = CALC_PREVIEW_FNS[typeId];
  if (!box || !fn) return;

  const result = fn();

  if (result.value === null) {
    box.innerHTML = result.message;
    return;
  }

  let html = 'Estimated Maturity Value<span class="calc-preview__value">' + formatCurrency(result.value) + '</span>';

  const enteredRaw = getFieldValue('maturityValueEntered');
  if (enteredRaw) {
    const entered = Number(enteredRaw);
    const diffFraction = Math.abs(entered - result.value) / result.value;
    if (diffFraction > 0.01) {
      html += '<div class="calc-preview__diff-note">Calculated maturity value differs from your entered value.</div>';
    }
  }

  box.innerHTML = html;
}

/* ---------- 11. ADD ASSET: VALIDATION & SAVE ---------- */

function validateAssetForm(typeId, fields) {
  const errors = [];
  const values = {};

  fields.forEach(function (field) {
    const raw = getFieldValue(field.key);
    values[field.key] = raw;

    if (field.required && !raw) {
      errors.push('Please enter ' + field.label.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\*$/, '') + '.');
      return;
    }

    if (field.kind === 'number' && raw !== '') {
      const num = Number(raw);
      if (field.min !== undefined && num < field.min) {
        errors.push(field.label.replace(/\s*\(.*?\)\s*/g, '') + ' cannot be negative.');
      }
    }
  });

  // Maturity date should not be before the asset's start date.
  const startKey = START_DATE_FIELD[typeId];
  if (startKey && values[startKey] && values.maturityDate) {
    if (new Date(values.maturityDate) < new Date(values[startKey])) {
      errors.push('Maturity Date should not be before the investment/start date.');
    }
  }

  return { errors: errors, values: values };
}

function saveAssetForm(event) {
  event.preventDefault();
  if (!selectedAssetType) return;

  const fields = ASSET_FIELD_CONFIGS[selectedAssetType];
  const { errors, values } = validateAssetForm(selectedAssetType, fields);

  const errorBox = document.getElementById('formErrors');
  if (errors.length > 0) {
    errorBox.innerHTML = errors.map(function (e) { return '<li>' + e + '</li>'; }).join('');
    errorBox.style.display = 'block';
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  errorBox.style.display = 'none';

  // Build the asset object: numbers parsed as numbers, blanks as
  // null (never guessed), text kept as-is.
  const asset = { id: generateId(), type: selectedAssetType, createdAt: new Date().toISOString() };
  fields.forEach(function (field) {
    const raw = values[field.key];
    if (field.kind === 'number') {
      asset[field.key] = raw === '' ? null : Number(raw);
    } else {
      asset[field.key] = raw === '' ? null : raw;
    }
  });

  // If a live-calculated maturity value exists for this type, store
  // it alongside the user's entered value — never overwrite one
  // with the other.
  if (CALC_PREVIEW_FNS[selectedAssetType]) {
    const calc = CALC_PREVIEW_FNS[selectedAssetType]();
    asset.maturityValueCalculated = calc.value;
  }

  // A typed institution that isn't in the master list yet gets
  // saved as a custom institution for next time.
  if (asset.institution) {
    const exists = getAllInstitutions().some(function (inst) {
      return inst.name.toLowerCase() === asset.institution.toLowerCase();
    });
    if (!exists) addCustomInstitution(asset.institution);
  }

  updateData(STORAGE_KEYS.assets, [], function (list) {
    list.push(asset);
    return list;
  });

  const typeMeta = ASSET_TYPES.find(function (t) { return t.id === selectedAssetType; });
  document.getElementById('successAssetLabel').textContent = typeMeta.label;
  document.getElementById('assetForm').style.display = 'none';
  document.getElementById('successBanner').style.display = 'block';

  refreshInstitutionOptions();
  renderDashboard();
}

function resetAddAssetScreen() {
  selectedAssetType = null;
  document.querySelectorAll('.type-btn').forEach(function (btn) {
    btn.classList.remove('is-selected');
  });
  document.getElementById('formCard').style.display = 'none';
  document.getElementById('assetForm').style.display = 'block';
  document.getElementById('successBanner').style.display = 'none';
  document.getElementById('formErrors').style.display = 'none';
}

function initAddAssetScreen() {
  renderTypeGrid();
  refreshInstitutionOptions();

  const form = document.getElementById('assetForm');
  if (form) form.addEventListener('submit', saveAssetForm);

  const cancelBtn = document.getElementById('btnCancelAdd');
  if (cancelBtn) cancelBtn.addEventListener('click', resetAddAssetScreen);

  const addAnotherBtn = document.getElementById('btnAddAnother');
  if (addAnotherBtn) addAnotherBtn.addEventListener('click', resetAddAssetScreen);
}

/* ---------- APP START ---------- */
document.addEventListener('DOMContentLoaded', function () {
  initNavigation();
  initSettingsScreen();
  initDashboardSort();
  initAddAssetScreen();
});
