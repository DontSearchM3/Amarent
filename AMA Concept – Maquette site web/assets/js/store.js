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

const VERSION = 2;

function seed() {
  const d0 = today();
  const rel = (n) => iso(addDays(d0, n));
  const now = new Date().toISOString();
  const base = { createdAt: now, updatedAt: now, photos: [], internalNote: '' };

  const leasing = [
    { ...base, id: uid(), status: 'available', featured: true, brand: 'Volkswagen', model: 'Golf R', version: '2.0 TSI 4MOTION DSG', year: 2022, firstReg: '2022-04', km: 38000, body: 'berline', fuel: 'essence', gearbox: 'auto', drive: 'integrale', powerHp: 320, engineCc: 1984, seats: 5, doors: 5, luggage: 341, colorExt: 'Noir', colorInt: 'Tissu noir', consumption: '8.1 l/100 km', co2: 184, energyLabel: 'G', equipment: ['clim_auto', 'gps', 'carplay', 'android_auto', 'camera', 'radar', 'acc', 'sieges_chauffants', 'led', 'jantes', 'keyless'], description: 'Annonce de démonstration. Véhicule entretenu, carnet à jour.', monthly: 689, takeover: 4000, monthsLeft: 24, endDate: '2028-10', kmPerYear: 15000, lessor: '', residual: 28500, transferFee: 450 },
    { ...base, id: uid(), status: 'available', featured: true, brand: 'Mercedes-AMG', model: 'A 35', version: '4MATIC', year: 2023, firstReg: '2023-02', km: 21500, body: 'berline', fuel: 'essence', gearbox: 'auto', drive: 'integrale', powerHp: 306, engineCc: 1991, seats: 5, doors: 5, luggage: 370, colorExt: 'Blanc polaire', colorInt: 'Similicuir noir', consumption: '8.4 l/100 km', co2: 192, energyLabel: 'G', equipment: ['clim_auto', 'gps', 'carplay', 'camera', 'radar', 'led', 'jantes', 'sieges_chauffants', 'audio'], description: 'Annonce de démonstration.', monthly: 749, takeover: 5000, monthsLeft: 30, endDate: '2029-04', kmPerYear: 15000, lessor: '', residual: 31000, transferFee: 450 },
    { ...base, id: uid(), status: 'reserved', featured: true, brand: 'Mercedes-AMG', model: 'CLA 45 S', version: '4MATIC+ Coupé', year: 2022, firstReg: '2022-09', km: 29000, body: 'coupe', fuel: 'essence', gearbox: 'auto', drive: 'integrale', powerHp: 421, engineCc: 1991, seats: 5, doors: 4, luggage: 460, colorExt: 'Gris montagne', colorInt: 'Cuir noir', consumption: '9.1 l/100 km', co2: 207, energyLabel: 'G', equipment: ['clim_auto', 'gps', 'carplay', 'camera360', 'radar', 'acc', 'cuir', 'toit_pano', 'led', 'jantes', 'keyless', 'audio', 'hud'], description: 'Annonce de démonstration.', monthly: 995, takeover: 7500, monthsLeft: 18, endDate: '2028-04', kmPerYear: 12000, lessor: '', residual: 42000, transferFee: 450 },
    { ...base, id: uid(), status: 'available', featured: false, brand: 'Audi', model: 'RS3 Sportback', version: '2.5 TFSI quattro', year: 2023, firstReg: '2023-06', km: 12000, body: 'berline', fuel: 'essence', gearbox: 'auto', drive: 'integrale', powerHp: 400, engineCc: 2480, seats: 5, doors: 5, luggage: 282, colorExt: 'Gris Nardo', colorInt: 'Alcantara noir', consumption: '9.0 l/100 km', co2: 205, energyLabel: 'G', equipment: ['clim_auto', 'gps', 'carplay', 'android_auto', 'camera', 'radar', 'acc', 'sieges_chauffants', 'led', 'jantes', 'audio', 'angle_mort'], description: 'Annonce de démonstration.', monthly: 1090, takeover: 8000, monthsLeft: 36, endDate: '2029-10', kmPerYear: 10000, lessor: '', residual: 45000, transferFee: 450 },
    { ...base, id: uid(), status: 'available', featured: false, brand: 'Tesla', model: 'Model Y', version: 'Long Range AWD', year: 2023, firstReg: '2023-03', km: 34000, body: 'suv', fuel: 'electrique', gearbox: 'auto', drive: 'integrale', powerHp: 514, engineCc: null, seats: 5, doors: 5, luggage: 854, colorExt: 'Bleu', colorInt: 'Similicuir noir', consumption: '16.9 kWh/100 km', co2: 0, energyLabel: 'A', equipment: ['clim_auto', 'gps', 'bluetooth', 'camera', 'acc', 'lane', 'sieges_chauffants', 'toit_pano', 'keyless', 'hayon', 'chargeur_induction'], description: 'Annonce de démonstration.', monthly: 629, takeover: 3000, monthsLeft: 22, endDate: '2028-08', kmPerYear: 20000, lessor: '', residual: 26000, transferFee: 450 },
  ];

  const rentals = [
    { ...base, id: uid(), status: 'available', brand: 'Volkswagen', model: 'Polo', version: '1.0 TSI', year: 2023, km: 18000, body: 'citadine', fuel: 'essence', gearbox: 'auto', drive: 'traction', powerHp: 95, seats: 5, doors: 5, luggage: 351, colorExt: 'Blanc', colorInt: 'Tissu', consumption: '5.6 l/100 km', equipment: ['clim', 'carplay', 'bluetooth', 'radar', 'regulateur'], description: 'Annonce de démonstration. Idéale en ville.', priceDay: 89, priceWeekend: 170, priceWeek: 520, kmPerDay: 150, extraKm: null, deposit: 0, minAge: 18, licenseYears: 1, blocked: [{ from: rel(3), to: rel(5), reason: 'Réservé' }, { from: rel(12), to: rel(13), reason: 'Réservé' }] },
    { ...base, id: uid(), status: 'available', brand: 'Mercedes-Benz', model: 'Classe A 200', version: 'AMG Line', year: 2023, km: 26000, body: 'berline', fuel: 'essence', gearbox: 'auto', drive: 'traction', powerHp: 163, seats: 5, doors: 5, luggage: 370, colorExt: 'Blanc polaire', colorInt: 'Similicuir', consumption: '6.2 l/100 km', equipment: ['clim_auto', 'gps', 'carplay', 'camera', 'radar', 'led', 'jantes'], description: 'Annonce de démonstration.', priceDay: 129, priceWeekend: 245, priceWeek: 760, kmPerDay: 150, extraKm: null, deposit: 0, minAge: 18, licenseYears: 1, blocked: [{ from: rel(7), to: rel(9), reason: 'Réservé' }] },
    { ...base, id: uid(), status: 'available', brand: 'Volkswagen', model: 'Tiguan', version: '2.0 TDI 4MOTION', year: 2022, km: 41000, body: 'suv', fuel: 'diesel', gearbox: 'auto', drive: 'integrale', powerHp: 150, seats: 5, doors: 5, luggage: 615, colorExt: 'Gris', colorInt: 'Tissu', consumption: '6.1 l/100 km', equipment: ['clim_auto', 'gps', 'carplay', 'camera', 'radar', 'acc', 'attelage', 'hayon'], description: 'Annonce de démonstration. Grand coffre, idéal en famille.', priceDay: 149, priceWeekend: 280, priceWeek: 880, kmPerDay: 150, extraKm: null, deposit: 0, minAge: 18, licenseYears: 1, blocked: [{ from: rel(1), to: rel(2), reason: 'Réservé' }, { from: rel(18), to: rel(20), reason: 'Entretien' }] },
    { ...base, id: uid(), status: 'available', brand: 'Mercedes-AMG', model: 'CLA 45 S', version: '4MATIC+', year: 2022, km: 33000, body: 'coupe', fuel: 'essence', gearbox: 'auto', drive: 'integrale', powerHp: 421, seats: 5, doors: 4, luggage: 460, colorExt: 'Gris montagne', colorInt: 'Cuir noir', consumption: '9.1 l/100 km', equipment: ['clim_auto', 'gps', 'carplay', 'camera360', 'cuir', 'toit_pano', 'audio', 'hud', 'led', 'jantes'], description: 'Annonce de démonstration.', priceDay: 290, priceWeekend: 550, priceWeek: 1690, kmPerDay: 150, extraKm: null, deposit: 0, minAge: 18, licenseYears: 1, blocked: [{ from: rel(5), to: rel(6), reason: 'Réservé' }] },
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
    settings: { kmPerDay: CONFIG.defaultKmPerDay, extraKm: null, googleReviewUrl: '', email: '', address: '', hours: '' },
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
