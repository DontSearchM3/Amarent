/**
 * Couche de données.
 *
 * En démo : les données vivent dans localStorage (une copie par navigateur).
 * En production : remplacer l'implémentation interne par Firestore
 * (mêmes méthodes : all / get / upsert / patch / remove / subscribe),
 * le reste du site n'a pas à changer.
 */
import { CONFIG } from './config.js';
import { uid, iso, addDays, today, safeStorage } from './utils.js';

const VERSION = 4;

function seed() {
  const d0 = today();
  const rel = (n) => iso(addDays(d0, n));
  const now = new Date().toISOString();
  const base = { createdAt: now, updatedAt: now, photos: [], internalNote: '' };

  const P = 'assets/img/vehicles/bmw-m135i/';
  const leasing = [
    {
      ...base, id: uid(), offerType: 'financing', status: 'available', featured: true,
      brand: 'BMW', model: 'M135i xDrive', version: 'LCI · Pack M Sport', year: 2015, firstReg: '2014-04', km: 164000,
      body: 'compacte', fuel: 'essence', gearbox: 'auto', drive: 'integrale', powerHp: 370, engineCc: 2979, seats: 5, doors: 3, luggage: 360,
      colorExt: 'Noir métallisé', colorInt: '', consumption: '', co2: null, energyLabel: '',
      equipment: ['acc', 'lane', 'lane_change', 'front_assist', 'proactive', 'traffic_sign', 'radar', 'park_assist', 'camera', 'gps', 'paddles'],
      photos: [`${P}couverture.webp`, `${P}arriere.webp`, `${P}interieur.webp`, `${P}volant.webp`, `${P}avant.webp`],
      description: "BMW M135i xDrive LCI avec Pack M Sport, boîte automatique et transmission intégrale.\nVéhicule suisse, expertise (MFK) et service récents.\nGarantie jusqu'à 24 mois possible. Service gratuit jusqu'à 10 ans possible.",
      salePrice: 14900, monthly: 159, monthlyNoDeposit: 245, downPayment: null, durationMonths: null, rate: null, lessor: '',
      warrantyMonths: 24, mfkFresh: true, serviceFresh: true, swiss: true,
      takeover: null, monthsLeft: null, endDate: '', kmPerYear: null, transferFee: null, residual: null,
      internalNote: "Annonce d'origine : « Les roues sont en prévente, les deux avant sont peintes en noir » (à clarifier).\nÀ compléter : montant de l'acompte, durée, taux annuel effectif et société de leasing (obligatoires dans une publicité de leasing).\n370 ch annoncés (326 ch d'origine) : vérifier si préparation homologuée.",
    },
    {
      ...base, id: uid(), offerType: 'financing', status: 'available', featured: true,
      brand: 'Mercedes-Benz', model: 'A 180 d', version: 'Progressive', year: null, firstReg: '', km: null,
      body: 'compacte', fuel: 'diesel', gearbox: '', drive: 'traction', powerHp: null, engineCc: null, seats: 5, doors: 5, luggage: null,
      colorExt: 'Blanc', colorInt: '', consumption: '', co2: null, energyLabel: '',
      equipment: ['led', 'clim_auto', 'camera', 'radar', 'front_assist', 'attention', 'keyless'],
      photos: ['A/avant.webp', 'A/arriere.webp', 'A/arriere-2.webp', 'A/interieur.webp', 'A/ecran.webp', 'A/phare.webp'].map((x) => x.replace('A/', 'assets/img/vehicles/mercedes-a180d/')),
      description: "Mercedes-Benz A 180 d Progressive.\nExpertise (MFK) récente, garantie, leasing et financement possibles.",
      salePrice: null, monthly: 259, monthlyNoDeposit: null, downPayment: null, durationMonths: null, rate: null, lessor: '',
      warranty: true, warrantyMonths: null, mfkFresh: true, serviceFresh: false, swiss: false,
      takeover: null, monthsLeft: null, endDate: '', kmPerYear: null, transferFee: null, residual: null,
      internalNote: "Infos en attente : année, kilométrage, boîte, prix comptant, conditions du leasing (acompte, durée, taux, société). Équipements repris des photos, à vérifier.",
    },
    {
      ...base, id: uid(), offerType: 'financing', status: 'available', featured: true,
      brand: 'Mercedes-AMG', model: 'S 63 Coupé', version: '', year: null, firstReg: '', km: null,
      body: 'coupe', fuel: 'essence', gearbox: 'auto', drive: '', powerHp: null, engineCc: null, seats: 4, doors: 2, luggage: null,
      colorExt: 'Blanc', colorInt: '', consumption: '', co2: null, energyLabel: '',
      equipment: ['led', 'radar'],
      photos: [1, 2, 3, 4, 5, 6, 7].map((i) => `assets/img/vehicles/mercedes-s63/${i === 1 ? 'couverture' : i - 1}.webp`),
      description: 'Mercedes-AMG S 63 Coupé. Informations détaillées sur demande.',
      salePrice: null, monthly: null, monthlyNoDeposit: null, downPayment: null, durationMonths: null, rate: null, lessor: '',
      warranty: false, warrantyMonths: null, mfkFresh: false, serviceFresh: false, swiss: false,
      takeover: null, monthsLeft: null, endDate: '', kmPerYear: null, transferFee: null, residual: null,
      internalNote: 'Aucune information reçue pour le moment (prix, année, km, équipements). Affiché « Prix sur demande ».',
    },
  ];

  const T = 'assets/img/vehicles/audi-tt-rs/';
  const rentals = [
    {
      ...base, id: uid(), status: 'available', brand: 'Audi', model: 'TT RS Roadster', version: 'quattro', year: null, km: null,
      body: 'cabriolet', fuel: 'essence', gearbox: 'auto', drive: 'integrale', powerHp: null, seats: 2, doors: 2, luggage: null,
      colorExt: 'Blanc', colorInt: 'Cuir noir surpiqûres rouges', consumption: '',
      equipment: ['cuir', 'led', 'radar', 'paddles', 'keyless', 'clim_auto'],
      photos: [`${T}couverture.webp`, `${T}2.webp`, `${T}3.webp`, `${T}4.webp`, `${T}5.webp`, `${T}6.webp`],
      description: 'Audi TT RS Roadster quattro. Capote électrique, intérieur cuir.',
      priceDay: 250, dayWeekdaysOnly: true, kmPerDay: 250,
      priceWeekend: 600, weekendFriday: true, kmWeekend: 500,
      priceWeek: null, extraKm: null, deposit: 0, minAge: 18, licenseYears: 1, blocked: [],
      internalNote: "Annoncé comme « R8 » par le client, mais les photos montrent une Audi TT RS Roadster (volant RS, compteur TT RS). Nom à confirmer. Plaques GE 529 297.",
    },
  ];

  const washServices = [
    { id: 'ext', active: true, includes: [], prices: { citadine: 29, berline: 39, suv: 49 } },
    { id: 'int', active: true, includes: [], prices: { citadine: 39, berline: 49, suv: 59 } },
    { id: 'comp', active: true, includes: ['ext', 'int'], prices: { citadine: 59, berline: 69, suv: 79 } },
    { id: 'pol', active: true, includes: [], prices: { citadine: 349, berline: 499, suv: 599 } },
  ];

  const M = (brand, model, cat) => ({ id: uid(), brand, model, cat });
  const washModels = [
    // Citadines
    M('Volkswagen', 'Polo', 'citadine'), M('Volkswagen', 'up!', 'citadine'), M('Renault', 'Clio', 'citadine'), M('Renault', 'Zoe', 'citadine'),
    M('Peugeot', '208', 'citadine'), M('Fiat', '500', 'citadine'), M('Toyota', 'Yaris', 'citadine'), M('Mini', 'Cooper', 'citadine'),
    M('Audi', 'A1', 'citadine'), M('Opel', 'Corsa', 'citadine'), M('Ford', 'Fiesta', 'citadine'), M('Seat', 'Ibiza', 'citadine'),
    M('Skoda', 'Fabia', 'citadine'), M('Hyundai', 'i20', 'citadine'), M('Smart', 'Fortwo', 'citadine'), M('Citroën', 'C3', 'citadine'),
    // Berlines, compactes, breaks, coupés
    M('Volkswagen', 'Golf', 'berline'), M('Volkswagen', 'Passat', 'berline'), M('Volkswagen', 'Arteon', 'berline'), M('Audi', 'A3', 'berline'),
    M('Audi', 'RS3', 'berline'), M('Audi', 'A4', 'berline'), M('Audi', 'A5', 'berline'), M('Audi', 'A6', 'berline'), M('BMW', 'Série 1', 'berline'),
    M('BMW', 'Série 3', 'berline'), M('BMW', 'Série 4', 'berline'), M('BMW', 'Série 5', 'berline'), M('BMW', 'M3', 'berline'), M('BMW', 'M4', 'berline'),
    M('Mercedes', 'Classe A', 'berline'), M('Mercedes', 'A 35', 'berline'), M('Mercedes', 'A 45', 'berline'), M('Mercedes', 'Classe C', 'berline'),
    M('Mercedes', 'Classe E', 'berline'), M('Mercedes', 'CLA', 'berline'), M('Mercedes', 'CLA 45', 'berline'), M('Tesla', 'Model 3', 'berline'),
    M('Tesla', 'Model S', 'berline'), M('Skoda', 'Octavia', 'berline'), M('Peugeot', '308', 'berline'), M('Peugeot', '508', 'berline'),
    M('Porsche', '911', 'berline'), M('Porsche', 'Taycan', 'berline'), M('Cupra', 'Leon', 'berline'), M('Toyota', 'Corolla', 'berline'),
    // SUV
    M('Volkswagen', 'Tiguan', 'suv'), M('Volkswagen', 'T-Roc', 'suv'), M('Volkswagen', 'Touareg', 'suv'), M('Audi', 'Q3', 'suv'),
    M('Audi', 'Q5', 'suv'), M('Audi', 'Q7', 'suv'), M('Audi', 'Q8', 'suv'), M('Audi', 'RS Q8', 'suv'), M('BMW', 'X1', 'suv'), M('BMW', 'X2', 'suv'),
    M('BMW', 'X3', 'suv'), M('BMW', 'X4', 'suv'), M('BMW', 'X5', 'suv'), M('BMW', 'X6', 'suv'), M('BMW', 'X7', 'suv'), M('Mercedes', 'GLA', 'suv'),
    M('Mercedes', 'GLB', 'suv'), M('Mercedes', 'GLC', 'suv'), M('Mercedes', 'GLE', 'suv'), M('Mercedes', 'Classe G', 'suv'), M('Mercedes', 'G 63', 'suv'),
    M('Tesla', 'Model Y', 'suv'), M('Tesla', 'Model X', 'suv'), M('Porsche', 'Cayenne', 'suv'), M('Porsche', 'Macan', 'suv'), M('Land Rover', 'Range Rover', 'suv'),
    M('Land Rover', 'Defender', 'suv'), M('Peugeot', '3008', 'suv'), M('Peugeot', '5008', 'suv'), M('Skoda', 'Kodiaq', 'suv'), M('Toyota', 'RAV4', 'suv'),
    M('Dacia', 'Duster', 'suv'), M('Kia', 'Sportage', 'suv'), M('Kia', 'EV6', 'suv'), M('Hyundai', 'Tucson', 'suv'), M('Volvo', 'XC60', 'suv'), M('Volvo', 'XC90', 'suv'),
    M('Cupra', 'Formentor', 'suv'), M('Lamborghini', 'Urus', 'suv'),
  ];

  return {
    version: VERSION,
    leasing,
    rentals,
    reservations: [],
    washServices,
    washModels,
    washRequests: [],
    reviews: [],
    messages: [],
    settings: { kmPerDay: CONFIG.defaultKmPerDay, extraKm: null, googleReviewUrl: '', email: '', address: 'Route du Bois-de-Bay 105, 1242 Satigny', hours: '', open247: true },
  };
}

let db = null;
const listeners = new Set();
let lastSaveOk = true;

function load() {
  const raw = safeStorage.get(CONFIG.storageKey);
  if (raw) {
    try { const d = JSON.parse(raw); if (d && d.version === VERSION) return d; } catch { /* données corrompues : on repart du jeu de démo */ }
  }
  return seed();
}
function persist() { lastSaveOk = safeStorage.set(CONFIG.storageKey, JSON.stringify(db)); return lastSaveOk; }
function notify(col) { listeners.forEach((fn) => { try { fn(col); } catch (e) { console.error(e); } }); }
function commit(col) { const ok = persist(); notify(col); return ok; }

export const Store = {
  init() {
    db = load();
    persist();
    // Synchronisation entre onglets (équivalent de onSnapshot dans Firestore).
    window.addEventListener('storage', (e) => {
      if (e.key === CONFIG.storageKey && e.newValue) {
        try { const d = JSON.parse(e.newValue); if (d.version === VERSION) { db = d; notify('*'); } } catch { /* ignore */ }
      }
    });
  },
  all(col) { return db[col]; },
  get(col, id) { return db[col].find((x) => x.id === id) || null; },
  settings() { return db.settings; },
  saveSettings(patch) { Object.assign(db.settings, patch); return commit('settings'); },
  /** Crée ou met à jour un élément. Retourne { ok, item }. */
  upsert(col, obj) {
    const now = new Date().toISOString();
    let item;
    const i = obj.id ? db[col].findIndex((x) => x.id === obj.id) : -1;
    if (i > -1) { item = { ...db[col][i], ...obj, updatedAt: now }; db[col][i] = item; }
    else { item = { ...obj, id: obj.id || uid(), createdAt: now, updatedAt: now }; db[col].push(item); }
    return { ok: commit(col), item };
  },
  patch(col, id, patch) { const x = this.get(col, id); if (!x) return false; Object.assign(x, patch, { updatedAt: new Date().toISOString() }); return commit(col); },
  remove(col, id) { db[col] = db[col].filter((x) => x.id !== id); return commit(col); },
  replaceAll(col, list) { db[col] = list; return commit(col); },
  reset() { db = seed(); return commit('*'); },
  exportJSON() { return JSON.stringify(db, null, 2); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  get lastSaveOk() { return lastSaveOk; },
};
