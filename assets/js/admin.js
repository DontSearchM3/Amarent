/**
 * AMA Concept — espace partenaire (chargé uniquement sur #admin).
 *
 * DÉMO : aucune authentification réelle, données dans ce navigateur.
 * PRODUCTION : Firebase Authentication (rôles admin / staff par custom claims),
 * Firestore avec règles de sécurité, Storage pour les photos, Cloud Functions
 * pour les confirmations e-mail/SMS et la vérification anti double-réservation.
 */
import {
  CONFIG, BODY_TYPES, FUELS, GEARBOXES, DRIVES, ENERGY_LABELS, EQUIPMENT, WASH_CATS,
} from './config.js';
import { Store } from './store.js';
import { DICTS } from './i18n.js';
import {
  esc, fmtNum, fmtDate, fromISO, iso, today, addDays, toast, waLink, resizeImage, safeImg, CAR_SVG,
  confirmDialog, download, toCSV, safeSession, norm, starsHTML,
} from './utils.js';
import { detectCat } from './app.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const FR = (k) => DICTS.fr[k] ?? k;
const num = (v) => fmtNum(v, 'fr');
const chf = (v) => `${num(v)} CHF`;
const hasVal = (x) => x !== null && x !== undefined && x !== '';
const vTitle = (v) => `${v.brand || ''} ${v.model || ''}`.trim();
const when = (isoStr) => (isoStr ? new Date(isoStr).toLocaleString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const MAX_PHOTOS = 12;

const adm = {
  root: null, tab: 'dashboard', silent: 0, subscribed: false,
  f: {
    leasing: { q: '', status: '' }, rentals: { q: '', status: '' },
    reservations: { status: 'pending', q: '' }, wash: { status: 'pending', q: '' },
    reviews: { status: 'pending' }, messages: { status: 'new', q: '' }, models: { q: '' },
  },
};
/** Écriture locale sans re-rendu automatique (on rafraîchit nous-mêmes). */
const write = (fn) => { adm.silent++; try { return fn(); } finally { adm.silent--; } };
function warnIfNotSaved(ok) {
  if (ok === false || (ok && ok.ok === false)) toast('Stockage de démonstration plein : retirez des photos. En production, les photos sont sur Firebase Storage.', 'error');
}

/* =========================================================
   Libellés
   ========================================================= */
const STATUS_LABEL = {
  leasing: { available: 'Disponible', reserved: 'En cours de reprise', taken: 'Repris (masqué)', hidden: 'Masqué (brouillon)' },
  rentals: { available: 'Disponible', maintenance: 'Indisponible (visible)', hidden: 'Masqué' },
  req: { pending: 'En attente', confirmed: 'Confirmée', refused: 'Refusée', cancelled: 'Annulée', done: 'Terminée' },
  reviews: { pending: 'À modérer', published: 'Publié', rejected: 'Refusé' },
  messages: { new: 'Nouveau', read: 'Lu', archived: 'Archivé' },
};
const OFFER_LABEL = { day: 'Journée', weekend: 'Week-end', week: 'Semaine' };
const SLOT_LABEL = { morning: 'Matin', afternoon: 'Après-midi', evening: 'Fin de journée' };
const SERVICE_LABEL = { rent: 'Location', leasing: 'Reprise de leasing', wash: 'Lavage', other: 'Autre' };
const pill = (cls, label) => `<span class="pill ${esc(cls)}">${esc(label)}</span>`;

/* Messages prêts à envoyer au client (dans sa langue). */
const WA_TPL = {
  fr: {
    rentOk: (r, a, b) => `Bonjour ${r.client.name}, votre réservation AMARENT est confirmée : ${r.vehicleLabel}, ${a === b ? `le ${a}` : `du ${a} au ${b}`}. Total : ${r.total} CHF, ${r.kmIncluded} km inclus. À bientôt ! AMA Concept`,
    rentNo: (r) => `Bonjour ${r.client.name}, nous sommes désolés : le véhicule ${r.vehicleLabel} n'est pas disponible aux dates demandées. Pouvons-nous vous proposer une autre date ou un autre véhicule ? AMA Concept`,
    washOk: (w, d) => `Bonjour ${w.client.name}, votre passage AMAWASH est confirmé le ${d} (${w.slotLabel}). Total : ${w.total} CHF. À bientôt ! AMAWASH`,
    washNo: (w) => `Bonjour ${w.client.name}, le créneau demandé chez AMAWASH n'est pas disponible. Pouvons-nous vous proposer un autre moment ? AMAWASH`,
  },
  en: {
    rentOk: (r, a, b) => `Hello ${r.client.name}, your AMARENT booking is confirmed: ${r.vehicleLabel}, ${a === b ? `on ${a}` : `from ${a} to ${b}`}. Total: CHF ${r.total}, ${r.kmIncluded} km included. See you soon! AMA Concept`,
    rentNo: (r) => `Hello ${r.client.name}, we are sorry: the ${r.vehicleLabel} is not available on the requested dates. May we suggest another date or vehicle? AMA Concept`,
    washOk: (w, d) => `Hello ${w.client.name}, your AMAWASH appointment is confirmed on ${d} (${w.slotLabel}). Total: CHF ${w.total}. See you soon! AMAWASH`,
    washNo: (w) => `Hello ${w.client.name}, the requested AMAWASH time slot is not available. May we suggest another time? AMAWASH`,
  },
  de: {
    rentOk: (r, a, b) => `Guten Tag ${r.client.name}, Ihre AMARENT-Reservierung ist bestätigt: ${r.vehicleLabel}, ${a === b ? `am ${a}` : `vom ${a} bis ${b}`}. Total: CHF ${r.total}, ${r.kmIncluded} km inklusive. Bis bald! AMA Concept`,
    rentNo: (r) => `Guten Tag ${r.client.name}, leider ist der ${r.vehicleLabel} zu den gewünschten Daten nicht verfügbar. Dürfen wir Ihnen ein anderes Datum oder Fahrzeug vorschlagen? AMA Concept`,
    washOk: (w, d) => `Guten Tag ${w.client.name}, Ihr AMAWASH-Termin ist bestätigt am ${d} (${w.slotLabel}). Total: CHF ${w.total}. Bis bald! AMAWASH`,
    washNo: (w) => `Guten Tag ${w.client.name}, das gewünschte Zeitfenster bei AMAWASH ist nicht verfügbar. Dürfen wir Ihnen einen anderen Termin vorschlagen? AMAWASH`,
  },
};
const tplFor = (lang) => WA_TPL[lang] || WA_TPL.fr;
const SLOT_I18N = { fr: SLOT_LABEL, en: { morning: 'morning', afternoon: 'afternoon', evening: 'late afternoon' }, de: { morning: 'Vormittag', afternoon: 'Nachmittag', evening: 'später Nachmittag' } };

/* =========================================================
   Montage et coquille
   ========================================================= */
export function mountAdmin(root) {
  adm.root = root;
  if (!adm.subscribed) {
    adm.subscribed = true;
    Store.subscribe(() => {
      if (adm.silent || !document.body.classList.contains('admin-mode')) return;
      if (!$('.adm', adm.root)) return;
      renderSide();
      if (adm.tab !== 'settings') renderTab();
    });
  }
  if (safeSession.get(CONFIG.adminSessionKey) !== '1') { renderGate(); return; }
  if (!$('.adm', root)) renderShell();
  renderSide(); renderTab();
}

function renderGate() {
  adm.root.innerHTML = `<div class="adm-gate"><form class="panel" id="admLogin">
    <p class="kicker">AMA Concept</p>
    <h1 class="h2">Espace partenaire</h1>
    <p class="muted">En production, l'accès se fait avec un compte personnel (e-mail et mot de passe, double authentification). Aucun mot de passe n'est écrit dans le code du site.</p>
    <div class="field"><label for="admMail">E-mail</label><input id="admMail" type="email" placeholder="Actif en production" disabled></div>
    <div class="field"><label for="admPwd">Mot de passe</label><input id="admPwd" type="password" placeholder="••••••••" disabled></div>
    <button class="btn block" type="submit">Entrer dans la démo</button>
    <p class="fine">Mode démo : les données sont enregistrées uniquement dans ce navigateur.</p>
  </form></div>`;
  $('#admLogin').addEventListener('submit', (e) => {
    e.preventDefault(); safeSession.set(CONFIG.adminSessionKey, '1');
    renderShell(); renderSide(); renderTab();
  });
}

const TABS = [
  ['dashboard', 'Tableau de bord'], ['leasing', 'Reprises de leasing'], ['rentals', 'Véhicules de location'],
  ['reservations', 'Réservations'], ['wash', 'Demandes de lavage'], ['washcfg', 'Wash : tarifs et modèles'],
  ['reviews', 'Avis clients'], ['messages', 'Messages'], ['settings', 'Paramètres'],
];
function counts() {
  return {
    reservations: Store.all('reservations').filter((x) => x.status === 'pending').length,
    wash: Store.all('washRequests').filter((x) => x.status === 'pending').length,
    reviews: Store.all('reviews').filter((x) => x.status === 'pending').length,
    messages: Store.all('messages').filter((x) => x.status === 'new').length,
  };
}
function renderShell() {
  adm.root.innerHTML = `<div class="adm">
    <aside class="adm-side" aria-label="Menu de l'espace partenaire">
      <div class="who"><b>Mustapha Yildrim</b><small>Administrateur · démo</small></div>
      <div id="admTabs" style="display:contents"></div>
      <div class="side-foot">
        <a class="btn ghost sm" href="#accueil">Voir le site</a>
        <button class="btn ghost sm" type="button" id="admLogout">Quitter</button>
      </div>
    </aside>
    <div class="adm-main" id="admMain"></div>
  </div>`;
  $('#admTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    adm.tab = b.dataset.tab; renderSide(); renderTab();
    $('#admMain').focus?.(); window.scrollTo({ top: 0 });
  });
  $('#admLogout').addEventListener('click', () => { safeSession.remove(CONFIG.adminSessionKey); location.hash = '#accueil'; });
  ensureEditor();
}
function renderSide() {
  const c = counts(); const box = $('#admTabs'); if (!box) return;
  box.innerHTML = TABS.map(([id, label]) => `<button class="adm-tab" type="button" data-tab="${id}" aria-current="${adm.tab === id}">
    <span>${esc(label)}</span>${c[id] ? `<span class="n">${c[id]}</span>` : ''}</button>`).join('');
}
function renderTab() {
  const main = $('#admMain'); if (!main) return;
  ({
    dashboard: tabDashboard, leasing: () => tabVehicles('leasing'), rentals: () => tabVehicles('rentals'),
    reservations: tabReservations, wash: tabWash, washcfg: tabWashCfg, reviews: tabReviews, messages: tabMessages, settings: tabSettings,
  }[adm.tab] || tabDashboard)(main);
}
const head = (title, sub, actions = '') => `<div class="adm-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="row-actions">${actions}</div></div>`;
function go(tab, status) {
  adm.tab = tab;
  if (status && adm.f[tab]) adm.f[tab].status = status;
  renderSide(); renderTab(); window.scrollTo({ top: 0 });
}

/* =========================================================
   Tableau de bord
   ========================================================= */
function tabDashboard(main) {
  const c = counts();
  const L = Store.all('leasing'); const R = Store.all('rentals');
  const t0 = iso(today()); const in14 = iso(addDays(today(), 14));
  const upcoming = Store.all('reservations').filter((r) => r.status === 'confirmed' && r.end >= t0 && r.start <= in14).sort((a, b) => a.start.localeCompare(b.start));
  const pub = Store.all('reviews').filter((r) => r.status === 'published');
  const avg = pub.length ? (pub.reduce((a, r) => a + r.rating, 0) / pub.length).toFixed(1) : '—';
  const kpi = (tab, n, label, alert = false, status = '') => `<button class="kpi ${alert && n ? 'alert' : ''}" type="button" data-go="${tab}" data-status="${status}"><b>${n}</b><span>${esc(label)}</span></button>`;
  main.innerHTML = `${head('Tableau de bord', `Bonjour Mustapha. Voici ce qui demande votre attention aujourd'hui, ${fmtDate(today(), 'fr', { weekday: 'long', day: 'numeric', month: 'long' })}.`)}
    <div class="kpis">
      ${kpi('reservations', c.reservations, 'Réservations à valider', true, 'pending')}
      ${kpi('wash', c.wash, 'Lavages à valider', true, 'pending')}
      ${kpi('reviews', c.reviews, 'Avis à modérer', true, 'pending')}
      ${kpi('messages', c.messages, 'Nouveaux messages', true, 'new')}
      ${kpi('leasing', L.filter((v) => v.status === 'available').length, 'Leasings disponibles')}
      ${kpi('rentals', R.filter((v) => v.status === 'available').length, 'Véhicules à louer')}
      ${kpi('reviews', avg, `Note moyenne (${pub.length} avis)`, false, 'published')}
    </div>
    <div class="grid2">
      <div class="panel">
        <h2 class="h3 mb">Locations à venir (14 jours)</h2>
        ${upcoming.length ? `<div class="card-list">${upcoming.map((r) => `<div class="req"><div><h4>${esc(r.vehicleLabel)}</h4><p>${esc(r.client.name)} · ${esc(fmtDate(r.start, 'fr'))}${r.end !== r.start ? ` → ${esc(fmtDate(r.end, 'fr'))}` : ''}</p></div><div>${pill('confirmed', 'Confirmée')}</div></div>`).join('')}</div>`
          : '<p class="muted">Aucune location confirmée dans les 14 prochains jours.</p>'}
      </div>
      <div class="panel">
        <h2 class="h3 mb">Raccourcis</h2>
        <div class="card-list">
          <button class="btn ghost" type="button" data-new="leasing">+ Ajouter un leasing à reprendre</button>
          <button class="btn ghost" type="button" data-new="rentals">+ Ajouter un véhicule de location</button>
          <button class="btn ghost" type="button" data-go="washcfg">Modifier les tarifs AMAWASH</button>
          <button class="btn ghost" type="button" data-go="settings">Lien pour demander un avis</button>
        </div>
      </div>
    </div>`;
  main.onclick = (e) => {
    const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go, g.dataset.status || ''); return; }
    const n = e.target.closest('[data-new]'); if (n) openEditor(n.dataset.new);
  };
}

/* =========================================================
   Véhicules (leasing et location)
   ========================================================= */
function tabVehicles(col) {
  const isL = col === 'leasing'; const f = adm.f[col];
  const main = $('#admMain');
  main.innerHTML = `${head(isL ? 'Reprises de leasing' : 'Véhicules de location',
    isL ? 'Annonces publiées sur la page Reprises. « Repris » retire l\'annonce du site.' : 'Flotte AMARENT proposée à la réservation.',
    `<button class="btn ghost sm" type="button" id="vExport">Exporter (CSV)</button><button class="btn sm" type="button" id="vAdd">+ Ajouter un véhicule</button>`)}
    <div class="toolbar">
      <input class="grow" type="search" id="vQ" placeholder="Rechercher marque, modèle, plaques…" value="${esc(f.q)}" aria-label="Rechercher">
      <select id="vS" aria-label="Filtrer par statut"><option value="">Tous les statuts</option>${Object.entries(STATUS_LABEL[col]).map(([k, l]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
    </div>
    <div class="table-wrap"><table class="tbl"><thead><tr>
      <th></th><th>Véhicule</th>${isL ? '<th>Mensualité</th><th>Reprise</th><th>Restant</th><th>À la une</th>' : '<th>Jour / WE / Semaine</th><th>Km / jour</th><th>Indispo. à venir</th>'}<th>Statut</th><th style="text-align:right">Actions</th>
    </tr></thead><tbody id="vBody"></tbody></table></div>`;
  const list = () => {
    const q = norm(f.q);
    const rows = Store.all(col).filter((v) => (!f.status || v.status === f.status)
      && (!q || norm(`${v.brand} ${v.model} ${v.version} ${v.plate || ''} ${v.colorExt || ''}`).includes(q)))
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    $('#vBody').innerHTML = rows.length ? rows.map((v) => {
      const p = safeImg((v.photos || [])[0]);
      const t0 = iso(today());
      const blockedSoon = (v.blocked || []).filter((b) => (b.to || b.from) >= t0).length
        + Store.all('reservations').filter((r) => r.vehicleId === v.id && r.status === 'confirmed' && r.end >= t0).length;
      return `<tr>
        <td><div class="thumb-sm">${p ? `<img src="${p}" alt="">` : CAR_SVG}</div></td>
        <td><b>${esc(vTitle(v))}</b><br><small>${esc(v.version || '')}${v.year ? ` · ${v.year}` : ''}${hasVal(v.km) ? ` · ${num(v.km)} km` : ''} · ${(v.photos || []).length} photo(s)</small></td>
        ${isL
          ? `<td><b>${chf(v.monthly)}</b></td><td>${hasVal(v.takeover) ? chf(v.takeover) : '—'}</td><td>${hasVal(v.monthsLeft) ? `${v.monthsLeft} mois` : '—'}</td>
             <td><label class="switch" aria-label="À la une"><input type="checkbox" data-feat="${esc(v.id)}" ${v.featured ? 'checked' : ''}></label></td>`
          : `<td>${chf(v.priceDay)}<br><small>${hasVal(v.priceWeekend) ? chf(v.priceWeekend) : '—'} · ${hasVal(v.priceWeek) ? chf(v.priceWeek) : '—'}</small></td>
             <td>${num(v.kmPerDay || Store.settings().kmPerDay)} km</td><td>${blockedSoon}</td>`}
        <td><select data-status="${esc(v.id)}" aria-label="Statut">${Object.entries(STATUS_LABEL[col]).map(([k, l]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></td>
        <td><div class="actions">
          <button class="btn xs" type="button" data-edit="${esc(v.id)}">Modifier</button>
          <button class="btn ghost xs" type="button" data-dup="${esc(v.id)}">Dupliquer</button>
          <button class="btn red xs" type="button" data-del="${esc(v.id)}">Supprimer</button>
        </div></td></tr>`;
    }).join('') : `<tr><td colspan="9" class="empty-row">Aucun véhicule. Cliquez sur « Ajouter un véhicule ».</td></tr>`;
  };
  list();
  $('#vQ').addEventListener('input', (e) => { f.q = e.target.value; list(); });
  $('#vS').addEventListener('change', (e) => { f.status = e.target.value; list(); });
  $('#vAdd').addEventListener('click', () => openEditor(col));
  $('#vExport').addEventListener('click', () => {
    const rows = Store.all(col);
    const keys = ['brand', 'model', 'version', 'year', 'km', 'body', 'fuel', 'gearbox', 'powerHp', 'seats', ...(isL ? ['monthly', 'takeover', 'monthsLeft', 'endDate'] : ['priceDay', 'priceWeekend', 'priceWeek', 'kmPerDay']), 'status'];
    download(`ama-${col}-${iso(today())}.csv`, toCSV([keys, ...rows.map((v) => keys.map((k) => v[k]))]), 'text/csv');
  });
  $('#vBody').onchange = (e) => {
    const s = e.target.closest('[data-status]'); const ft = e.target.closest('[data-feat]');
    if (s) { write(() => Store.patch(col, s.dataset.status, { status: s.value })); toast(`Statut : ${STATUS_LABEL[col][s.value]}`, 'success'); }
    if (ft) { write(() => Store.patch(col, ft.dataset.feat, { featured: ft.checked })); toast(ft.checked ? 'Mis à la une' : 'Retiré de la une', 'success'); }
  };
  $('#vBody').onclick = async (e) => {
    const ed = e.target.closest('[data-edit]'); const dup = e.target.closest('[data-dup]'); const del = e.target.closest('[data-del]');
    if (ed) openEditor(col, ed.dataset.edit);
    if (dup) {
      const v = Store.get(col, dup.dataset.dup); if (!v) return;
      const copy = JSON.parse(JSON.stringify(v)); delete copy.id; copy.model = `${copy.model} (copie)`; copy.status = 'hidden'; copy.featured = false; copy.blocked = [];
      const res = write(() => Store.upsert(col, copy)); warnIfNotSaved(res);
      toast('Copie créée (masquée). Modifiez-la puis publiez-la.', 'success'); list(); openEditor(col, res.item.id);
    }
    if (del) {
      const v = Store.get(col, del.dataset.del); if (!v) return;
      const resa = Store.all('reservations').filter((r) => r.vehicleId === v.id && ['pending', 'confirmed'].includes(r.status)).length;
      const ok = await confirmDialog(`Supprimer définitivement « ${vTitle(v)} » ?${resa ? ` ${resa} réservation(s) en cours y sont liées.` : ''} Pour le retirer temporairement, préférez le statut « Masqué ».`, { ok: 'Supprimer', danger: true });
      if (!ok) return;
      write(() => Store.remove(col, v.id)); toast('Véhicule supprimé', 'success'); list(); renderSide();
    }
  };
}

/* ---------- Éditeur de fiche véhicule ---------- */
const opt = (arr, prefix) => arr.map((v) => [v, FR(`${prefix}.${v}`)]);
const F = {
  brand: { label: 'Marque', req: true, ph: 'Ex. Mercedes-AMG' },
  model: { label: 'Modèle', req: true, ph: 'Ex. CLA 45 S' },
  version: { label: 'Version / finition', ph: 'Ex. 4MATIC+ Coupé' },
  year: { label: 'Année modèle', type: 'number', min: 1980, max: 2035 },
  firstReg: { label: '1re immatriculation', type: 'month' },
  km: { label: 'Kilométrage (km)', type: 'number', min: 0 },
  colorExt: { label: 'Couleur extérieure', ph: 'Ex. Gris Nardo' },
  colorInt: { label: 'Intérieur / sellerie', ph: 'Ex. Cuir noir' },
  plate: { label: 'Plaques', internal: true, ph: 'GE …' },
  vin: { label: 'N° de châssis (VIN)', internal: true },
  body: { label: 'Carrosserie', type: 'select', req: true, opts: () => opt(BODY_TYPES, 'body') },
  fuel: { label: 'Énergie', type: 'select', opts: () => opt(FUELS, 'fuel') },
  gearbox: { label: 'Boîte de vitesses', type: 'select', opts: () => opt(GEARBOXES, 'gearbox') },
  drive: { label: 'Transmission', type: 'select', opts: () => opt(DRIVES, 'drive') },
  powerHp: { label: 'Puissance (ch)', type: 'number', min: 0, help: 'Les kW sont calculés automatiquement.' },
  engineCc: { label: 'Cylindrée (cm³)', type: 'number', min: 0 },
  seats: { label: 'Places', type: 'number', min: 1, max: 9 },
  doors: { label: 'Portes', type: 'number', min: 0, max: 6 },
  luggage: { label: 'Coffre (litres)', type: 'number', min: 0 },
  consumption: { label: 'Consommation', ph: 'Ex. 6.2 l/100 km' },
  co2: { label: 'CO₂ (g/km)', type: 'number', min: 0 },
  energyLabel: { label: 'Étiquette énergie', type: 'select', opts: () => ENERGY_LABELS.map((x) => [x, x]) },
  monthly: { label: 'Mensualité (CHF)', type: 'number', req: true, min: 0 },
  takeover: { label: 'Montant de reprise (CHF)', type: 'number', min: 0 },
  monthsLeft: { label: 'Mois restants', type: 'number', min: 0 },
  endDate: { label: 'Fin du contrat', type: 'month' },
  kmPerYear: { label: 'Km / an autorisés', type: 'number', min: 0 },
  transferFee: { label: 'Frais de transfert (CHF)', type: 'number', min: 0 },
  residual: { label: 'Valeur résiduelle (CHF)', type: 'number', min: 0 },
  lessor: { label: 'Société de leasing', internal: true },
  priceDay: { label: 'Prix journée (CHF)', type: 'number', req: true, min: 0 },
  priceWeekend: { label: 'Prix week-end, 2 jours (CHF)', type: 'number', min: 0, help: 'Vide = offre non proposée.' },
  priceWeek: { label: 'Prix semaine, 7 jours (CHF)', type: 'number', min: 0, help: 'Vide = offre non proposée.' },
  kmPerDay: { label: 'Km inclus par jour', type: 'number', min: 0, ph: '150' },
  extraKm: { label: 'Km supplémentaire (CHF)', type: 'number', min: 0, step: '0.05', help: 'Vide = valeur des paramètres.' },
  deposit: { label: 'Caution (CHF)', type: 'number', min: 0 },
  minAge: { label: 'Âge minimum', type: 'number', min: 18, max: 99 },
  licenseYears: { label: 'Permis depuis (années)', type: 'number', min: 0, max: 50 },
  status: { label: 'Statut', type: 'select', req: true },
  featured: { label: 'Mettre à la une sur l\'accueil', type: 'switch' },
  description: { label: 'Description publique', type: 'textarea', span: 3, ph: 'Points forts, historique, entretien, garantie…' },
  internalNote: { label: 'Note interne', type: 'textarea', span: 3, internal: true },
};
const SECTIONS = {
  leasing: [
    { id: 'ident', title: 'Identification', fields: ['brand', 'model', 'version', 'year', 'firstReg', 'km', 'colorExt', 'colorInt', 'plate', 'vin'] },
    { id: 'tech', title: 'Technique', fields: ['body', 'fuel', 'gearbox', 'drive', 'powerHp', 'engineCc', 'seats', 'doors', 'luggage', 'consumption', 'co2', 'energyLabel'] },
    { id: 'eq', title: 'Équipements', custom: 'equipment' },
    { id: 'photos', title: 'Photos', custom: 'photos' },
    { id: 'terms', title: 'Conditions de reprise', fields: ['monthly', 'takeover', 'monthsLeft', 'endDate', 'kmPerYear', 'transferFee', 'residual', 'lessor'] },
    { id: 'pub', title: 'Publication', fields: ['status', 'featured', 'description', 'internalNote'] },
  ],
  rentals: [
    { id: 'ident', title: 'Identification', fields: ['brand', 'model', 'version', 'year', 'firstReg', 'km', 'colorExt', 'colorInt', 'plate', 'vin'] },
    { id: 'tech', title: 'Technique', fields: ['body', 'fuel', 'gearbox', 'drive', 'powerHp', 'engineCc', 'seats', 'doors', 'luggage', 'consumption', 'co2', 'energyLabel'] },
    { id: 'eq', title: 'Équipements', custom: 'equipment' },
    { id: 'photos', title: 'Photos', custom: 'photos' },
    { id: 'terms', title: 'Tarifs et conditions', fields: ['priceDay', 'priceWeekend', 'priceWeek', 'kmPerDay', 'extraKm', 'deposit', 'minAge', 'licenseYears'] },
    { id: 'avail', title: 'Indisponibilités', custom: 'blocked' },
    { id: 'pub', title: 'Publication', fields: ['status', 'description', 'internalNote'] },
  ],
};
const BLANK = {
  leasing: { status: 'hidden', featured: false, equipment: [], photos: [], body: 'berline', fuel: 'essence', gearbox: 'auto' },
  rentals: { status: 'hidden', equipment: [], photos: [], blocked: [], body: 'citadine', fuel: 'essence', gearbox: 'auto', kmPerDay: 150, deposit: 0, minAge: 18, licenseYears: 1 },
};

let ed = null;
function ensureEditor() {
  if ($('#admEditor')) return;
  const d = document.createElement('dialog');
  d.className = 'dialog dialog-xl'; d.id = 'admEditor'; d.setAttribute('aria-labelledby', 'edTitle');
  document.body.appendChild(d);
  d.addEventListener('cancel', (e) => { e.preventDefault(); tryCloseEditor(); });
  d.addEventListener('input', (e) => {
    if (ed) ed.dirty = true;
    const el = e.target;
    if (el.getAttribute?.('aria-invalid') === 'true' && el.checkValidity() && !(el.required && !el.value.trim())) {
      el.setAttribute('aria-invalid', 'false');
      const panel = el.closest('[role="tabpanel"]');
      if (panel && !panel.querySelector('[aria-invalid="true"]')) d.querySelector(`[data-sec="${panel.id.slice(4)}"]`)?.classList.remove('err');
    }
  });
  d.addEventListener('change', () => { if (ed) ed.dirty = true; });
}

function fieldHTML(k, val, col) {
  const f = F[k]; const id = `ed_${k}`;
  const span = f.span === 3 ? 'span3' : f.span === 2 ? 'span2' : '';
  if (f.type === 'switch') return `<div class="field ${span}"><label class="switch"><input type="checkbox" id="${id}" data-k="${k}" ${val ? 'checked' : ''}> ${esc(f.label)}</label></div>`;
  let input;
  if (f.type === 'select') {
    const opts = k === 'status' ? Object.entries(STATUS_LABEL[col]) : f.opts();
    input = `<select id="${id}" data-k="${k}" ${f.req ? 'required' : ''}>${f.req ? '' : '<option value="">—</option>'}${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(val ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea id="${id}" data-k="${k}" rows="4" placeholder="${esc(f.ph || '')}">${esc(val ?? '')}</textarea>`;
  } else {
    const ty = f.type || 'text';
    input = `<input id="${id}" data-k="${k}" type="${ty}" value="${esc(val ?? '')}" ${f.req ? 'required' : ''} ${hasVal(f.min) ? `min="${f.min}"` : ''} ${hasVal(f.max) ? `max="${f.max}"` : ''} ${ty === 'number' ? `step="${f.step || 'any'}" inputmode="decimal"` : ''} placeholder="${esc(f.ph || '')}">`;
  }
  return `<div class="field ${span}"><label for="${id}">${esc(f.label)}${f.req ? ' <span class="req-star" aria-hidden="true">*</span>' : ''}${f.internal ? ' <small class="muted">· interne</small>' : ''}</label>${input}${f.help ? `<small class="hint">${esc(f.help)}</small>` : ''}</div>`;
}

function openEditor(col, id) {
  ensureEditor();
  const src = id ? Store.get(col, id) : null;
  const item = JSON.parse(JSON.stringify(src || { ...BLANK[col] }));
  item.photos = item.photos || []; item.equipment = item.equipment || []; if (col === 'rentals') item.blocked = item.blocked || [];
  ed = { col, item, dirty: false, tab: 'ident', isNew: !src };
  const d = $('#admEditor');
  const secs = SECTIONS[col];
  d.innerHTML = `<form class="editor" id="edForm" novalidate>
    <button class="dialog-x" type="button" data-ed-close aria-label="Fermer">&times;</button>
    <div class="editor-head"><div><p class="kicker" style="margin:0 0 4px">${col === 'leasing' ? 'Reprise de leasing' : 'Véhicule de location'}</p><h2 id="edTitle">${src ? esc(vTitle(src)) : 'Nouveau véhicule'}</h2></div></div>
    <div class="editor-tabs" role="tablist">${secs.map((s) => `<button type="button" role="tab" id="tab_${s.id}" aria-controls="sec_${s.id}" aria-selected="${s.id === ed.tab}" data-sec="${s.id}">${esc(s.title)}</button>`).join('')}</div>
    <div class="editor-body">${secs.map((s) => `<section role="tabpanel" id="sec_${s.id}" aria-labelledby="tab_${s.id}" ${s.id === ed.tab ? '' : 'hidden'}>${sectionHTML(s, col)}</section>`).join('')}</div>
    <div class="editor-foot">
      <small class="muted">${src ? `Créé le ${when(src.createdAt)} · modifié le ${when(src.updatedAt)}` : 'Les champs marqués * sont obligatoires.'}</small>
      <div class="row-actions"><button class="btn ghost" type="button" data-ed-close>Annuler</button><button class="btn" type="submit">Enregistrer</button></div>
    </div>
  </form>`;
  renderPhotos(); renderBlocked();
  bindEditor(d);
  d.showModal();
  $('#ed_brand', d)?.focus();
}

function sectionHTML(s, col) {
  const it = ed.item;
  if (s.custom === 'equipment') {
    return `<p class="hint" style="margin:0 0 14px">Cochez les équipements présents. Ils s'affichent sur la fiche publique, traduits automatiquement.</p>
      <div class="eq-grid">${EQUIPMENT.map((k) => `<label class="check"><input type="checkbox" data-eq value="${k}" ${it.equipment.includes(k) ? 'checked' : ''}><span>${esc(FR(`eq.${k}`))}</span></label>`).join('')}</div>`;
  }
  if (s.custom === 'photos') {
    return `<div class="dropzone" id="edDrop" tabindex="0" role="button" aria-label="Ajouter des photos">
        <b>Glissez vos photos ici</b> ou cliquez pour les choisir<br><small>JPG, PNG ou WebP · jusqu'à ${MAX_PHOTOS} photos · la première est la photo principale</small>
        <input type="file" id="edFile" accept="image/jpeg,image/png,image/webp" multiple hidden>
      </div>
      <p class="hint">Photos : <span id="edPhotoCount"></span>. Elles sont redimensionnées automatiquement pour un affichage rapide.</p>
      <div class="photo-grid" id="edPhotos"></div>`;
  }
  if (s.custom === 'blocked') {
    return `<p class="hint" style="margin:0 0 14px">Bloquez les dates où le véhicule n'est pas louable (réservation par téléphone, entretien, usage interne). Elles apparaissent barrées dans le calendrier public. Les réservations confirmées en ligne sont bloquées automatiquement.</p>
      <div id="edBlocked"></div>
      <button class="btn ghost sm" type="button" id="edAddBlock">+ Ajouter une période</button>`;
  }
  return `<div class="fgrid">${s.fields.map((k) => fieldHTML(k, it[k], col)).join('')}</div>`;
}

function renderPhotos() {
  const g = $('#edPhotos'); if (!g) return;
  const ph = ed.item.photos;
  g.innerHTML = ph.map((p, i) => `<div class="photo">
      <img src="${safeImg(p)}" alt="Photo ${i + 1}">${i === 0 ? '<span class="cover-tag">Principale</span>' : ''}
      <div class="ph-actions">
        ${i > 0 ? `<button type="button" data-ph="cover" data-i="${i}">Principale</button><button type="button" data-ph="left" data-i="${i}" aria-label="Avancer">←</button>` : ''}
        ${i < ph.length - 1 ? `<button type="button" data-ph="right" data-i="${i}" aria-label="Reculer">→</button>` : ''}
        <button type="button" data-ph="del" data-i="${i}" aria-label="Supprimer la photo">✕</button>
      </div></div>`).join('');
  $('#edPhotoCount').textContent = `${ph.length}/${MAX_PHOTOS}`;
}
async function addFiles(files) {
  const list = [...files].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
  const room = MAX_PHOTOS - ed.item.photos.length;
  if (!list.length) { toast('Formats acceptés : JPG, PNG, WebP', 'error'); return; }
  if (room <= 0) { toast(`Maximum ${MAX_PHOTOS} photos`, 'error'); return; }
  toast('Préparation des photos…');
  for (const f of list.slice(0, room)) {
    try { ed.item.photos.push(await resizeImage(f)); } catch { toast(`Impossible de lire ${f.name}`, 'error'); }
  }
  ed.dirty = true; renderPhotos();
  if (list.length > room) toast(`${list.length - room} photo(s) ignorée(s) : maximum ${MAX_PHOTOS}`, 'error');
}
function renderBlocked() {
  const box = $('#edBlocked'); if (!box) return;
  box.innerHTML = ed.item.blocked.length ? ed.item.blocked.map((b, i) => `<div class="blocked-row">
      <div class="field"><label for="bf${i}">Du</label><input type="date" id="bf${i}" data-b="from" data-i="${i}" value="${esc(b.from || '')}"></div>
      <div class="field"><label for="bt${i}">Au</label><input type="date" id="bt${i}" data-b="to" data-i="${i}" value="${esc(b.to || '')}"></div>
      <div class="field"><label for="br${i}">Motif (interne)</label><input id="br${i}" data-b="reason" data-i="${i}" value="${esc(b.reason || '')}" placeholder="Réservé, entretien…"></div>
      <button class="btn red sm" type="button" data-bdel="${i}" aria-label="Retirer la période">Retirer</button>
    </div>`).join('') : '<p class="muted">Aucune période bloquée.</p>';
}

function bindEditor(d) {
  d.onclick = (e) => {
    if (e.target === d || e.target.closest('[data-ed-close]')) { tryCloseEditor(); return; }
    const sec = e.target.closest('[data-sec]');
    if (sec) switchSection(sec.dataset.sec);
    const ph = e.target.closest('[data-ph]');
    if (ph) {
      const i = Number(ph.dataset.i); const arr = ed.item.photos;
      if (ph.dataset.ph === 'del') arr.splice(i, 1);
      if (ph.dataset.ph === 'cover') arr.unshift(arr.splice(i, 1)[0]);
      if (ph.dataset.ph === 'left' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      if (ph.dataset.ph === 'right' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      ed.dirty = true; renderPhotos();
    }
    if (e.target.closest('#edDrop') && !e.target.closest('input')) $('#edFile').click();
    if (e.target.closest('#edAddBlock')) {
      const t0 = iso(today()); ed.item.blocked.push({ from: t0, to: t0, reason: '' }); ed.dirty = true; renderBlocked();
      $(`#bf${ed.item.blocked.length - 1}`)?.focus();
    }
    const bd = e.target.closest('[data-bdel]');
    if (bd) { ed.item.blocked.splice(Number(bd.dataset.bdel), 1); ed.dirty = true; renderBlocked(); }
  };
  d.onchange = (e) => {
    if (e.target.id === 'edFile') { addFiles(e.target.files); e.target.value = ''; }
    const b = e.target.closest('[data-b]');
    if (b) {
      const row = ed.item.blocked[Number(b.dataset.i)]; row[b.dataset.b] = b.value;
      if (b.dataset.b === 'from' && (!row.to || row.to < row.from)) { row.to = row.from; renderBlocked(); }
    }
  };
  d.onkeydown = (e) => { if (e.target.id === 'edDrop' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('#edFile').click(); } };
  const drop = $('#edDrop', d);
  if (drop) {
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
  }
  $('#edForm', d).addEventListener('submit', (e) => { e.preventDefault(); saveEditor(); });
}

function switchSection(id) {
  ed.tab = id;
  $$('#admEditor [data-sec]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.sec === id)));
  $$('#admEditor [role="tabpanel"]').forEach((p) => { p.hidden = p.id !== `sec_${id}`; });
  $('#admEditor .editor-body').scrollTop = 0;
}

function collectEditor() {
  const d = $('#admEditor'); const out = {};
  $$('[data-k]', d).forEach((el) => {
    const k = el.dataset.k; const f = F[k];
    if (f.type === 'switch') out[k] = el.checked;
    else if (f.type === 'number') out[k] = el.value === '' ? null : Number(el.value);
    else out[k] = el.value.trim();
  });
  out.equipment = $$('[data-eq]:checked', d).map((x) => x.value);
  out.photos = ed.item.photos;
  if (ed.col === 'rentals') out.blocked = ed.item.blocked.filter((b) => b.from).map((b) => ({ ...b, to: b.to && b.to >= b.from ? b.to : b.from }));
  return out;
}
function validateEditor() {
  const d = $('#admEditor'); let first = null;
  $$('[role="tabpanel"]', d).forEach((p) => { $(`[data-sec="${p.id.slice(4)}"]`, d)?.classList.remove('err'); });
  $$('[data-k]', d).forEach((el) => {
    const bad = !el.checkValidity() || (el.required && !el.value.trim());
    el.setAttribute('aria-invalid', String(bad));
    if (bad) {
      const panel = el.closest('[role="tabpanel"]');
      $(`[data-sec="${panel.id.slice(4)}"]`, d)?.classList.add('err');
      if (!first) first = el;
    }
  });
  if (first) {
    switchSection(first.closest('[role="tabpanel"]').id.slice(4));
    first.focus();
    toast('Certains champs sont manquants ou invalides', 'error');
    return false;
  }
  return true;
}
function saveEditor() {
  if (!validateEditor()) return;
  const data = collectEditor();
  if (ed.col === 'leasing' && data.status === 'available' && !data.photos.length) toast('Astuce : une annonce avec photos est beaucoup plus consultée.');
  const res = write(() => Store.upsert(ed.col, { ...ed.item, ...data }));
  warnIfNotSaved(res);
  ed.dirty = false;
  $('#admEditor').close();
  toast(ed.isNew ? 'Véhicule ajouté' : 'Fiche enregistrée', 'success');
  renderTab();
}
async function tryCloseEditor() {
  if (ed?.dirty && !(await confirmDialog('Fermer sans enregistrer les modifications ?', { ok: 'Fermer sans enregistrer', danger: true }))) return;
  $('#admEditor').close();
}

/* =========================================================
   Réservations
   ========================================================= */
function segHTML(id, current, options) {
  return `<div class="seg" role="group" id="${id}">${options.map(([v, l, n]) => `<button type="button" data-v="${v}" aria-pressed="${current === v}">${esc(l)}${hasVal(n) ? ` (${n})` : ''}</button>`).join('')}</div>`;
}
function conflicts(r) {
  const days = new Set(); let d = fromISO(r.start); const end = fromISO(r.end);
  while (d <= end) { days.add(iso(d)); d = addDays(d, 1); }
  const v = Store.get('rentals', r.vehicleId); const hits = [];
  (v?.blocked || []).forEach((b) => { let x = fromISO(b.from); const e = fromISO(b.to || b.from); while (x <= e) { if (days.has(iso(x))) { hits.push(`période bloquée (${b.reason || 'sans motif'})`); break; } x = addDays(x, 1); } });
  Store.all('reservations').filter((o) => o.id !== r.id && o.vehicleId === r.vehicleId && o.status === 'confirmed')
    .forEach((o) => { if (o.start <= r.end && o.end >= r.start) hits.push(`réservation confirmée de ${o.client.name}`); });
  return hits;
}
function tabReservations(main) {
  const f = adm.f.reservations; const all = Store.all('reservations');
  const n = (s) => all.filter((x) => x.status === s).length;
  main.innerHTML = `${head('Réservations', 'Demandes reçues depuis la page Locations. Rien n\'est confirmé tant que vous n\'avez pas accepté.', '<button class="btn ghost sm" type="button" id="rExport">Exporter (CSV)</button>')}
    <div class="toolbar">${segHTML('rSeg', f.status, [['pending', 'En attente', n('pending')], ['confirmed', 'Confirmées', n('confirmed')], ['done', 'Terminées'], ['refused', 'Refusées'], ['cancelled', 'Annulées'], ['', 'Toutes']])}
      <input class="grow" type="search" id="rQ" placeholder="Client, véhicule, téléphone…" value="${esc(f.q)}" aria-label="Rechercher"></div>
    <div class="card-list" id="rList"></div>`;
  const list = () => {
    const q = norm(f.q);
    const rows = Store.all('reservations').filter((r) => (!f.status || r.status === f.status) && (!q || norm(`${r.client.name} ${r.client.tel} ${r.client.email} ${r.vehicleLabel}`).includes(q)))
      .sort((a, b) => (f.status === 'pending' ? String(a.createdAt).localeCompare(String(b.createdAt)) : String(a.start).localeCompare(String(b.start))));
    $('#rList').innerHTML = rows.length ? rows.map((r) => {
      const a = fmtDate(r.start, r.lang || 'fr'); const b = fmtDate(r.end, r.lang || 'fr');
      const tpl = tplFor(r.lang);
      const waTxt = r.status === 'refused' ? tpl.rentNo(r) : tpl.rentOk(r, a, b);
      const cf = r.status === 'pending' ? conflicts(r) : [];
      return `<article class="req">
        <div>
          <h4>${esc(r.client.name)} · ${esc(r.vehicleLabel)} ${pill(r.status, STATUS_LABEL.req[r.status])}</h4>
          <p><b>${esc(fmtDate(r.start, 'fr', { weekday: 'short', day: 'numeric', month: 'long' }))}${r.end !== r.start ? ` → ${esc(fmtDate(r.end, 'fr', { weekday: 'short', day: 'numeric', month: 'long' }))}` : ''}</b> · ${OFFER_LABEL[r.offer] || r.offer} (${r.days} j) · <b>${chf(r.total)}</b> · ${num(r.kmIncluded)} km inclus</p>
          <p>${esc(r.client.tel)} · ${esc(r.client.email)} · langue ${esc((r.lang || 'fr').toUpperCase())} · reçue le ${when(r.createdAt)}</p>
          ${r.note ? `<p>« ${esc(r.note)} »</p>` : ''}
          ${cf.length ? `<p style="color:var(--bad)">⚠ Conflit : ${esc(cf.join(', '))}</p>` : ''}
        </div>
        <div class="actions">
          ${r.status === 'pending' ? `<button class="btn green xs" type="button" data-act="confirm" data-id="${r.id}">Accepter</button><button class="btn red xs" type="button" data-act="refuse" data-id="${r.id}">Refuser</button>` : ''}
          ${r.status === 'confirmed' ? `<button class="btn ghost xs" type="button" data-act="done" data-id="${r.id}">Terminée</button><button class="btn red xs" type="button" data-act="cancel" data-id="${r.id}">Annuler</button>` : ''}
          <a class="btn ghost xs" href="${waLink(r.client.tel, waTxt)}" target="_blank" rel="noopener">WhatsApp</a>
          <a class="btn ghost xs" href="mailto:${esc(r.client.email)}?subject=${encodeURIComponent(`AMARENT – ${r.vehicleLabel}`)}&body=${encodeURIComponent(waTxt)}">E-mail</a>
        </div>
      </article>`;
    }).join('') : '<p class="panel empty-row">Aucune réservation dans cette catégorie.</p>';
  };
  list();
  $('#rSeg').onclick = (e) => { const b = e.target.closest('[data-v]'); if (!b) return; f.status = b.dataset.v; tabReservations(main); };
  $('#rQ').addEventListener('input', (e) => { f.q = e.target.value; list(); });
  $('#rExport').addEventListener('click', () => {
    const rows = Store.all('reservations');
    download(`ama-reservations-${iso(today())}.csv`, toCSV([['Statut', 'Véhicule', 'Début', 'Fin', 'Offre', 'Total CHF', 'Km inclus', 'Client', 'Téléphone', 'E-mail', 'Remarque', 'Reçue le'],
      ...rows.map((r) => [STATUS_LABEL.req[r.status], r.vehicleLabel, r.start, r.end, OFFER_LABEL[r.offer], r.total, r.kmIncluded, r.client.name, r.client.tel, r.client.email, r.note, r.createdAt])]), 'text/csv');
  });
  $('#rList').onclick = async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const r = Store.get('reservations', b.dataset.id); if (!r) return;
    const act = b.dataset.act;
    if (act === 'confirm') {
      const cf = conflicts(r);
      if (cf.length && !(await confirmDialog(`Attention, conflit avec : ${cf.join(', ')}. Confirmer quand même ?`, { ok: 'Confirmer quand même', danger: true }))) return;
      write(() => Store.patch('reservations', r.id, { status: 'confirmed', decidedAt: new Date().toISOString() }));
      toast('Réservation confirmée. En production, le client reçoit un e-mail et un SMS automatiquement.', 'success');
    }
    if (act === 'refuse') {
      if (!(await confirmDialog(`Refuser la demande de ${r.client.name} ?`, { ok: 'Refuser', danger: true }))) return;
      write(() => Store.patch('reservations', r.id, { status: 'refused', decidedAt: new Date().toISOString() }));
      toast('Demande refusée. Les dates sont de nouveau libres.', 'success');
    }
    if (act === 'cancel') {
      if (!(await confirmDialog('Annuler cette réservation confirmée ? Les dates seront libérées.', { ok: 'Annuler la réservation', danger: true }))) return;
      write(() => Store.patch('reservations', r.id, { status: 'cancelled' })); toast('Réservation annulée', 'success');
    }
    if (act === 'done') { write(() => Store.patch('reservations', r.id, { status: 'done' })); toast('Location terminée. Pensez à demander un avis au client.', 'success'); }
    renderSide(); list();
  };
}

/* =========================================================
   Demandes de lavage
   ========================================================= */
function tabWash(main) {
  const f = adm.f.wash; const all = Store.all('washRequests');
  const n = (s) => all.filter((x) => x.status === s).length;
  main.innerHTML = `${head('Demandes de lavage', 'Demandes reçues depuis la page Wash (uniquement sur place).')}
    <div class="toolbar">${segHTML('wSeg', f.status, [['pending', 'En attente', n('pending')], ['confirmed', 'Confirmées', n('confirmed')], ['done', 'Terminées'], ['refused', 'Refusées'], ['', 'Toutes']])}
      <input class="grow" type="search" id="wQ" placeholder="Client, modèle, téléphone…" value="${esc(f.q)}" aria-label="Rechercher"></div>
    <div class="card-list" id="wList"></div>`;
  const list = () => {
    const q = norm(f.q);
    const rows = Store.all('washRequests').filter((w) => (!f.status || w.status === f.status) && (!q || norm(`${w.client.name} ${w.client.tel} ${w.model}`).includes(q)))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    $('#wList').innerHTML = rows.length ? rows.map((w) => {
      const lang = w.lang || 'fr';
      const wx = { ...w, slotLabel: (SLOT_I18N[lang] || SLOT_LABEL)[w.slot] || w.slot };
      const txt = w.status === 'refused' ? tplFor(lang).washNo(wx) : tplFor(lang).washOk(wx, fmtDate(w.date, lang, { weekday: 'long', day: 'numeric', month: 'long' }));
      return `<article class="req">
        <div>
          <h4>${esc(w.client.name)} · ${esc(w.model || 'Modèle non précisé')} (${esc(FR(`cat.${w.cat}`))}) ${pill(w.status, STATUS_LABEL.req[w.status])}</h4>
          <p><b>${esc(fmtDate(w.date, 'fr', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${esc(SLOT_LABEL[w.slot] || w.slot)}</b> · ${esc(w.services.map((s) => FR(`svc.${s}`)).join(' + '))} · <b>${chf(w.total)}</b></p>
          <p>${esc(w.client.tel)} · reçue le ${when(w.createdAt)}</p>
          ${w.note ? `<p>« ${esc(w.note)} »</p>` : ''}
        </div>
        <div class="actions">
          ${w.status === 'pending' ? `<button class="btn green xs" type="button" data-act="confirmed" data-id="${w.id}">Confirmer</button><button class="btn red xs" type="button" data-act="refused" data-id="${w.id}">Refuser</button>` : ''}
          ${w.status === 'confirmed' ? `<button class="btn ghost xs" type="button" data-act="done" data-id="${w.id}">Terminé</button>` : ''}
          <a class="btn ghost xs" href="${waLink(w.client.tel, txt)}" target="_blank" rel="noopener">WhatsApp</a>
        </div></article>`;
    }).join('') : '<p class="panel empty-row">Aucune demande dans cette catégorie.</p>';
  };
  list();
  $('#wSeg').onclick = (e) => { const b = e.target.closest('[data-v]'); if (!b) return; f.status = b.dataset.v; tabWash(main); };
  $('#wQ').addEventListener('input', (e) => { f.q = e.target.value; list(); });
  $('#wList').onclick = (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    write(() => Store.patch('washRequests', b.dataset.id, { status: b.dataset.act, decidedAt: new Date().toISOString() }));
    toast({ confirmed: 'Passage confirmé. En production, le client reçoit un SMS.', refused: 'Demande refusée', done: 'Lavage terminé' }[b.dataset.act], 'success');
    renderSide(); list();
  };
}

/* =========================================================
   Wash : tarifs et modèles
   ========================================================= */
function tabWashCfg(main) {
  const f = adm.f.models;
  main.innerHTML = `${head('Wash : tarifs et modèles', 'Les prix et la liste des modèles alimentent directement la page Wash.')}
    <div class="panel mb">
      <h2 class="h3 mb">Tarifs par catégorie (CHF)</h2>
      <div class="price-grid" id="priceGrid">
        <div class="h">Prestation</div>${WASH_CATS.map((c) => `<div class="h hide-m">${esc(FR(`cat.${c}`))}</div>`).join('')}<div class="h hide-m">Active</div>
        ${Store.all('washServices').map((s) => `
          <div><b>${esc(FR(`svc.${s.id}`))}</b>${(s.includes || []).length ? `<br><small class="muted">Inclut : ${esc(s.includes.map((i) => FR(`svc.${i}`)).join(' + '))}</small>` : ''}</div>
          ${WASH_CATS.map((c) => `<input type="number" min="0" step="1" inputmode="numeric" value="${esc(s.prices[c])}" data-price="${s.id}" data-cat="${c}" aria-label="${esc(`${FR(`svc.${s.id}`)} – ${FR(`cat.${c}`)}`)}">`).join('')}
          <label class="switch" aria-label="Prestation active"><input type="checkbox" data-active="${s.id}" ${s.active ? 'checked' : ''}></label>`).join('')}
      </div>
      <p class="hint">Enregistrement automatique à chaque modification.</p>
    </div>
    <div class="panel">
      <div class="adm-head" style="margin-bottom:12px"><div><h2 class="h3">Modèles et catégories</h2><p>Sert à détecter la catégorie quand le client saisit son modèle (${Store.all('washModels').length} modèles).</p></div></div>
      <form class="row3 align-end" id="mAdd">
        <div class="field"><label for="mBrand">Marque</label><input id="mBrand" required placeholder="Ex. BMW"></div>
        <div class="field"><label for="mModel">Modèle</label><input id="mModel" required placeholder="Ex. X3"></div>
        <div class="field"><label for="mCat">Catégorie</label><div class="row-actions" style="flex-wrap:nowrap"><select id="mCat">${WASH_CATS.map((c) => `<option value="${c}">${esc(FR(`cat.${c}`))}</option>`).join('')}</select><button class="btn sm" type="submit">Ajouter</button></div></div>
      </form>
      <div class="toolbar">
        <input class="grow" type="search" id="mQ" placeholder="Filtrer les modèles…" value="${esc(f.q)}" aria-label="Filtrer les modèles">
        <input class="grow" type="search" id="mTest" placeholder="Tester la détection (ex. « bmw x3 xdrive »)" aria-label="Tester la détection">
        <span id="mTestOut" class="muted"></span>
      </div>
      <div class="table-wrap"><table class="tbl" style="min-width:520px"><thead><tr><th>Marque</th><th>Modèle</th><th>Catégorie</th><th></th></tr></thead><tbody id="mBody"></tbody></table></div>
    </div>`;
  const list = () => {
    const q = norm(f.q);
    const rows = Store.all('washModels').filter((m) => !q || norm(`${m.brand} ${m.model}`).includes(q)).sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, 'fr'));
    $('#mBody').innerHTML = rows.length ? rows.map((m) => `<tr><td>${esc(m.brand)}</td><td><b>${esc(m.model)}</b></td>
      <td><select data-mcat="${m.id}" aria-label="Catégorie">${WASH_CATS.map((c) => `<option value="${c}" ${m.cat === c ? 'selected' : ''}>${esc(FR(`cat.${c}`))}</option>`).join('')}</select></td>
      <td><div class="actions"><button class="btn red xs" type="button" data-mdel="${m.id}">Supprimer</button></div></td></tr>`).join('')
      : '<tr><td colspan="4" class="empty-row">Aucun modèle.</td></tr>';
  };
  list();
  $('#priceGrid').onchange = (e) => {
    const p = e.target.closest('[data-price]'); const a = e.target.closest('[data-active]');
    if (p) {
      const s = Store.all('washServices').find((x) => x.id === p.dataset.price);
      const v = Math.max(0, Math.round(Number(p.value) || 0)); p.value = v;
      write(() => Store.patch('washServices', s.id, { prices: { ...s.prices, [p.dataset.cat]: v } }));
      toast(`${FR(`svc.${s.id}`)} · ${FR(`cat.${p.dataset.cat}`)} : ${v} CHF`, 'success');
    }
    if (a) { write(() => Store.patch('washServices', a.dataset.active, { active: a.checked })); toast(a.checked ? 'Prestation activée' : 'Prestation masquée du site', 'success'); }
  };
  $('#mAdd').addEventListener('submit', (e) => {
    e.preventDefault();
    const brand = $('#mBrand').value.trim(); const model = $('#mModel').value.trim();
    if (!brand || !model) { toast('Marque et modèle requis', 'error'); return; }
    const dup = Store.all('washModels').find((m) => norm(m.brand) === norm(brand) && norm(m.model) === norm(model));
    if (dup) { toast('Ce modèle existe déjà', 'error'); return; }
    write(() => Store.upsert('washModels', { brand, model, cat: $('#mCat').value }));
    $('#mModel').value = ''; $('#mModel').focus(); toast('Modèle ajouté', 'success'); list();
  });
  $('#mQ').addEventListener('input', (e) => { f.q = e.target.value; list(); });
  $('#mTest').addEventListener('input', (e) => {
    const r = detectCat(e.target.value);
    $('#mTestOut').textContent = !e.target.value.trim() ? '' : r.cat ? `→ ${FR(`cat.${r.cat}`)} (${r.match.brand} ${r.match.model})` : (r.brand ? `→ marque seule (${r.brand}), modèle manquant` : '→ non reconnu');
  });
  $('#mBody').onchange = (e) => { const s = e.target.closest('[data-mcat]'); if (!s) return; write(() => Store.patch('washModels', s.dataset.mcat, { cat: s.value })); toast('Catégorie mise à jour', 'success'); };
  $('#mBody').onclick = (e) => { const b = e.target.closest('[data-mdel]'); if (!b) return; write(() => Store.remove('washModels', b.dataset.mdel)); list(); toast('Modèle supprimé', 'success'); };
}

/* =========================================================
   Avis clients
   ========================================================= */
const reviewUrl = () => `${location.origin}${location.pathname}#avis`;
function tabReviews(main) {
  const f = adm.f.reviews; const all = Store.all('reviews');
  const n = (s) => all.filter((x) => x.status === s).length;
  const url = reviewUrl();
  main.innerHTML = `${head('Avis clients', 'Rien n\'est publié sans votre validation. Les avis ne peuvent pas être modifiés, seulement publiés ou refusés.')}
    <div class="panel mb">
      <h2 class="h3 mb">Demander un avis à un client</h2>
      <p class="muted" style="margin-top:0">Envoyez ce lien après une location ou un lavage : il ouvre directement le formulaire d'avis.</p>
      <div class="copy-field"><input id="rvUrl" readonly value="${esc(url)}" aria-label="Lien d'avis"><button class="btn sm" type="button" id="rvCopy">Copier</button>
        <a class="btn ghost sm" target="_blank" rel="noopener" href="${waLink('', `Merci pour votre confiance ! Votre avis nous aide beaucoup : ${url}`)}">Partager sur WhatsApp</a></div>
    </div>
    <div class="toolbar">${segHTML('rvSeg', f.status, [['pending', 'À modérer', n('pending')], ['published', 'Publiés', n('published')], ['rejected', 'Refusés', n('rejected')], ['', 'Tous']])}</div>
    <div class="card-list" id="rvList"></div>`;
  const list = () => {
    const rows = Store.all('reviews').filter((r) => !f.status || r.status === f.status).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    $('#rvList').innerHTML = rows.length ? rows.map((r) => `<article class="req">
        <div><h4>${starsHTML(r.rating)} ${esc(r.name)} ${pill(r.status, STATUS_LABEL.reviews[r.status])}</h4>
          <p style="color:var(--ice)">« ${esc(r.text)} »</p>
          <p>${esc(SERVICE_LABEL[r.service] || r.service)} · langue ${esc((r.lang || 'fr').toUpperCase())} · reçu le ${when(r.createdAt)}</p></div>
        <div class="actions">
          ${r.status !== 'published' ? `<button class="btn green xs" type="button" data-rv="published" data-id="${r.id}">Publier</button>` : `<button class="btn ghost xs" type="button" data-rv="pending" data-id="${r.id}">Retirer du site</button>`}
          ${r.status !== 'rejected' ? `<button class="btn red xs" type="button" data-rv="rejected" data-id="${r.id}">Refuser</button>` : ''}
          <button class="btn ghost xs" type="button" data-rvdel="${r.id}">Supprimer</button>
        </div></article>`).join('') : '<p class="panel empty-row">Aucun avis dans cette catégorie.</p>';
  };
  list();
  $('#rvCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); toast('Lien copié', 'success'); } catch { $('#rvUrl').select(); toast('Sélectionné : copiez avec Ctrl+C'); }
  });
  $('#rvSeg').onclick = (e) => { const b = e.target.closest('[data-v]'); if (!b) return; f.status = b.dataset.v; tabReviews(main); };
  $('#rvList').onclick = async (e) => {
    const s = e.target.closest('[data-rv]'); const d = e.target.closest('[data-rvdel]');
    if (s) { write(() => Store.patch('reviews', s.dataset.id, { status: s.dataset.rv })); toast(s.dataset.rv === 'published' ? 'Avis publié sur le site' : 'Avis mis à jour', 'success'); }
    if (d) { if (!(await confirmDialog('Supprimer définitivement cet avis ?', { ok: 'Supprimer', danger: true }))) return; write(() => Store.remove('reviews', d.dataset.rvdel)); }
    renderSide(); list();
  };
}

/* =========================================================
   Messages
   ========================================================= */
function tabMessages(main) {
  const f = adm.f.messages; const all = Store.all('messages');
  const n = (s) => all.filter((x) => x.status === s).length;
  main.innerHTML = `${head('Messages', 'Messages reçus depuis la page Contact.')}
    <div class="toolbar">${segHTML('mSeg', f.status, [['new', 'Nouveaux', n('new')], ['read', 'Lus', n('read')], ['archived', 'Archivés', n('archived')], ['', 'Tous']])}
      <input class="grow" type="search" id="msQ" placeholder="Nom, e-mail, contenu…" value="${esc(f.q)}" aria-label="Rechercher"></div>
    <div class="card-list" id="msList"></div>`;
  const list = () => {
    const q = norm(f.q);
    const rows = Store.all('messages').filter((m) => (!f.status || m.status === f.status) && (!q || norm(`${m.name} ${m.email} ${m.message}`).includes(q))).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    $('#msList').innerHTML = rows.length ? rows.map((m) => `<article class="req">
        <div><h4>${esc(m.name)} · ${esc(FR(`motif.${m.motif}`))} ${pill(m.status, STATUS_LABEL.messages[m.status])}</h4>
          ${m.vehicleLabel ? `<p>Véhicule : ${esc(m.vehicleLabel)}</p>` : ''}
          <p style="color:var(--ice);white-space:pre-line">${esc(m.message)}</p>
          <p>${esc(m.email)}${m.tel ? ` · ${esc(m.tel)}` : ''} · langue ${esc((m.lang || 'fr').toUpperCase())} · reçu le ${when(m.createdAt)}</p></div>
        <div class="actions">
          <a class="btn xs" href="mailto:${esc(m.email)}?subject=${encodeURIComponent(`Re : ${FR(`motif.${m.motif}`)} – AMA Concept`)}" data-ms="read" data-id="${m.id}">Répondre</a>
          ${m.tel ? `<a class="btn ghost xs" href="${waLink(m.tel, `Bonjour ${m.name}, `)}" target="_blank" rel="noopener" data-ms="read" data-id="${m.id}">WhatsApp</a>` : ''}
          ${m.status === 'new' ? `<button class="btn ghost xs" type="button" data-ms="read" data-id="${m.id}">Marquer lu</button>` : ''}
          ${m.status !== 'archived' ? `<button class="btn ghost xs" type="button" data-ms="archived" data-id="${m.id}">Archiver</button>` : ''}
          <button class="btn red xs" type="button" data-msdel="${m.id}">Supprimer</button>
        </div></article>`).join('') : '<p class="panel empty-row">Aucun message dans cette catégorie.</p>';
  };
  list();
  $('#mSeg').onclick = (e) => { const b = e.target.closest('[data-v]'); if (!b) return; f.status = b.dataset.v; tabMessages(main); };
  $('#msQ').addEventListener('input', (e) => { f.q = e.target.value; list(); });
  $('#msList').onclick = async (e) => {
    const s = e.target.closest('[data-ms]'); const d = e.target.closest('[data-msdel]');
    if (s) { const m = Store.get('messages', s.dataset.id); if (m && !(m.status === 'archived' && s.dataset.ms === 'read')) write(() => Store.patch('messages', s.dataset.id, { status: s.dataset.ms })); setTimeout(() => { renderSide(); list(); }, 0); }
    if (d) { if (!(await confirmDialog('Supprimer définitivement ce message ?', { ok: 'Supprimer', danger: true }))) return; write(() => Store.remove('messages', d.dataset.msdel)); renderSide(); list(); }
  };
}

/* =========================================================
   Paramètres
   ========================================================= */
function tabSettings(main) {
  const s = Store.settings();
  main.innerHTML = `${head('Paramètres', 'Coordonnées affichées sur le site et valeurs par défaut.')}
    <form class="panel mb" id="setForm" novalidate>
      <h2 class="h3 mb">Coordonnées</h2>
      <div class="settings-grid">
        <div class="field"><label for="sEmail">E-mail de contact</label><input id="sEmail" type="email" value="${esc(s.email)}" placeholder="contact@amaconcept.com"></div>
        <div class="field"><label for="sAddr">Adresse</label><input id="sAddr" value="${esc(s.address)}" placeholder="Rue, numéro, NPA Genève"></div>
        <div class="field"><label for="sHours">Horaires</label><textarea id="sHours" rows="3" placeholder="Lun–Ven 9h–18h&#10;Sam 9h–13h">${esc(s.hours)}</textarea></div>
        <div class="field"><label for="sGoogle">Lien « Avis Google »</label><input id="sGoogle" type="url" pattern="https://.*" value="${esc(s.googleReviewUrl)}" placeholder="https://g.page/r/…/review"><small class="hint">Disponible dans votre fiche Google Business.</small></div>
      </div>
      <h2 class="h3 mb mt">Location : valeurs par défaut</h2>
      <div class="settings-grid">
        <div class="field"><label for="sKm">Km inclus par jour</label><input id="sKm" type="number" min="0" value="${esc(s.kmPerDay)}"></div>
        <div class="field"><label for="sExtra">Prix du km supplémentaire (CHF)</label><input id="sExtra" type="number" min="0" step="0.05" value="${esc(s.extraKm ?? '')}" placeholder="À définir"><small class="hint">Vide = « communiqué à la confirmation ».</small></div>
      </div>
      <button class="btn" type="submit">Enregistrer</button>
    </form>
    <div class="grid2">
      <div class="panel">
        <h2 class="h3 mb">Données de démonstration</h2>
        <p class="muted" style="margin-top:0">Les données de cette démo sont enregistrées dans ce navigateur uniquement.</p>
        <div class="row-actions"><button class="btn ghost sm" type="button" id="sExport">Exporter (JSON)</button><button class="btn red sm" type="button" id="sReset">Réinitialiser la démo</button></div>
      </div>
      <div class="panel arch">
        <h2 class="h3">Mise en production (Firebase)</h2>
        <div>• <b>Connexion</b> : Firebase Authentication, comptes nominatifs, rôles <code>admin</code> et <code>staff</code>, double authentification.</div>
        <div>• <b>Données</b> : Firestore (<code>leasing</code>, <code>rentals</code>, <code>reservations</code>, <code>washRequests</code>, <code>washServices</code>, <code>washModels</code>, <code>reviews</code>, <code>messages</code>, <code>settings</code>), règles de sécurité : lecture publique des annonces, écriture réservée à l'équipe, création de demandes uniquement via le serveur.</div>
        <div>• <b>Photos</b> : Firebase Storage, versions optimisées générées automatiquement.</div>
        <div>• <b>Serveur</b> : Cloud Functions pour vérifier les disponibilités dans une transaction (pas de double réservation), envoyer e-mails et SMS, limiter les abus (reCAPTCHA / App Check).</div>
        <div>• <b>Hébergement</b> : Firebase Hosting, HTTPS, domaine amaconcept.com.</div>
      </div>
    </div>`;
  $('#setForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const g = $('#sGoogle');
    if (g.value && !/^https:\/\//.test(g.value)) { g.setAttribute('aria-invalid', 'true'); g.focus(); toast('Le lien Google doit commencer par https://', 'error'); return; }
    if (!$('#sEmail').checkValidity()) { $('#sEmail').setAttribute('aria-invalid', 'true'); $('#sEmail').focus(); toast('E-mail invalide', 'error'); return; }
    write(() => Store.saveSettings({
      email: $('#sEmail').value.trim(), address: $('#sAddr').value.trim(), hours: $('#sHours').value.trim(), googleReviewUrl: g.value.trim(),
      kmPerDay: Number($('#sKm').value) || CONFIG.defaultKmPerDay, extraKm: $('#sExtra').value === '' ? null : Number($('#sExtra').value),
    }));
    toast('Paramètres enregistrés', 'success');
  });
  $('#sExport').addEventListener('click', () => download(`ama-concept-donnees-${iso(today())}.json`, Store.exportJSON(), 'application/json'));
  $('#sReset').addEventListener('click', async () => {
    if (!(await confirmDialog('Réinitialiser toutes les données de démonstration ? Les véhicules, demandes et avis ajoutés seront perdus.', { ok: 'Réinitialiser', danger: true }))) return;
    write(() => Store.reset()); toast('Démo réinitialisée', 'success'); renderSide(); renderTab();
  });
}
