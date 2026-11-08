/**
 * AMA Concept — site public.
 * Routage par ancre (#page?parametres), rendu à partir de Store, textes via i18n.
 */
import { CONFIG, BODY_TYPES } from './config.js';
import { Store } from './store.js';
import { initLang, setLang, getLang, t, tp, applyI18n } from './i18n.js';
import {
  esc, iso, fromISO, addDays, today, fmtNum, fmtDate, tokens, norm, waLink, toast,
  safeStorage, safeImg, CAR_SVG, starsHTML,
} from './utils.js';
import { renderLegal } from './legal.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const L = () => getLang();
const num = (v) => fmtNum(v, L());
const chf = (v) => (L() === 'fr' ? `${num(v)} CHF` : `CHF ${num(v)}`);

const PAGES = ['accueil', 'leasing', 'locations', 'wash', 'contact', 'qui', 'admin'];
const LEGAL = ['mentions-legales', 'cgv', 'confidentialite'];
const MOTIFS = ['info', 'vehicle', 'leasing', 'problem', 'wash', 'service', 'claim', 'other'];

const state = {
  page: null,
  legalKey: null,
  leasing: { body: '', sort: 'featured' },
  rent: { id: null, offer: 'day', start: null, cal: null },
  wash: { cat: null, sel: [] },
  rating: 0,
  gallery: { photos: [], i: 0 },
};

/* =========================================================
   Helpers véhicule
   ========================================================= */
const vTitle = (v) => `${v.brand || ''} ${v.model || ''}`.trim();
const photosOf = (v) => (v.photos || []).map(safeImg).filter(Boolean);
const hasVal = (x) => x !== null && x !== undefined && x !== '';
const fmtMonth = (ym) => (ym ? new Date(`${ym}-01T00:00:00`).toLocaleDateString(`${L()}-CH`, { month: 'long', year: 'numeric' }) : '');
const isFin = (v) => v.offerType === 'financing';
const visibleLeasing = () => Store.all('leasing').filter((v) => v.status === 'available' || v.status === 'reserved');
const visibleRentals = () => Store.all('rentals').filter((v) => v.status !== 'hidden');

function vimg(v, badges, kind) {
  const p = photosOf(v)[0];
  return `<button class="vimg ${p ? '' : 'noimg'}" type="button" data-open="${kind}" data-id="${esc(v.id)}" aria-label="${esc(`${t('card.details')} : ${vTitle(v)}`)}">
    ${p ? `<img src="${p}" alt="" loading="lazy" decoding="async">` : CAR_SVG}
    <span class="badges">${badges}</span></button>`;
}

function leasingCard(v) {
  const left = `<span class="badge solid">${esc(t(`offer_type.${isFin(v) ? 'financing' : 'takeover'}`))}</span>`;
  const right = v.status === 'reserved'
    ? `<span class="badge warn">${esc(t('status.reserved'))}</span>`
    : (v.body ? `<span class="badge">${esc(t(`body.${v.body}`))}</span>` : '');
  return `<article class="vcard">
    ${vimg(v, left + right, 'leasing')}
    <div class="vbody">
      <h3>${esc(vTitle(v))}</h3>
      <p class="vsub">${esc(v.version || '')}</p>
      <div class="specs">
        <div><small>${esc(t('spec.year'))}</small><b>${esc(v.year ?? '—')}</b></div>
        <div><small>${esc(t('spec.km'))}</small><b>${hasVal(v.km) ? `${num(v.km)} km` : '—'}</b></div>
        <div><small>${esc(t('spec.power'))}</small><b>${hasVal(v.powerHp) ? `${num(v.powerHp)} ${esc(t('unit.hp'))}` : '—'}</b></div>
        <div><small>${esc(t('spec.fuel'))}</small><b>${v.fuel ? esc(t(`fuel.${v.fuel}`)) : '—'}</b></div>
      </div>
      <div class="vprice">
        ${hasVal(v.monthly)
          ? `<div class="price">${isFin(v) ? `<small class="pre">${esc(t('card.from'))}</small>` : ''}${num(v.monthly)}<small>${esc(t('card.per_month'))}</small></div>`
          : `<div class="price on-request">${esc(t('card.on_request'))}</div>`}
        ${isFin(v)
          ? (hasVal(v.salePrice) ? `<div class="apport">${esc(t('lt.salePrice'))}<b>${chf(v.salePrice)}</b></div>` : '')
          : (hasVal(v.takeover) ? `<div class="apport">${esc(t('card.takeover'))}<b>${chf(v.takeover)}</b></div>` : '')}
      </div>
      <div class="vactions">
        <button class="btn ghost sm" type="button" data-open="leasing" data-id="${esc(v.id)}">${esc(t('card.details'))}</button>
        <a class="btn sm" href="#contact?motif=leasing&v=${encodeURIComponent(v.id)}">${esc(t(isFin(v) ? 'card.request_fin' : 'card.request'))}</a>
      </div>
    </div>
  </article>`;
}

/* =========================================================
   Carrousels avec barre de défilement
   ========================================================= */
function updateRail(wrap) {
  const rail = $('.rail', wrap); const thumb = $('.thumb', wrap); const track = $('.track', wrap); const count = $('.count', wrap);
  const sw = rail.scrollWidth; const cw = rail.clientWidth;
  const ratio = sw > 0 ? Math.min(1, cw / sw) : 1;
  thumb.style.width = `${ratio * 100}%`;
  thumb.style.left = sw > cw ? `${(rail.scrollLeft / sw) * 100}%` : '0%';
  const scrollable = ratio < 0.999;
  track.style.visibility = scrollable ? 'visible' : 'hidden';
  $$('[data-prev],[data-next]', wrap).forEach((b) => { b.style.visibility = scrollable ? 'visible' : 'hidden'; });
  const slides = $$('.slide', rail);
  if (!slides.length) { count.textContent = ''; return; }
  const step = slides[0].offsetWidth + 22;
  const first = Math.round(rail.scrollLeft / step) + 1;
  const visible = Math.max(1, Math.floor((cw + 22) / step));
  const last = Math.min(slides.length, first + visible - 1);
  count.textContent = visible > 1 && last > first ? `${first}–${last}/${slides.length}` : `${Math.min(first, slides.length)}/${slides.length}`;
}
const updateRails = () => $$('[data-rail]').forEach((w) => { if (w.offsetParent) updateRail(w); });

function initRail(wrap) {
  const rail = $('.rail', wrap); const track = $('.track', wrap); const thumb = $('.thumb', wrap);
  let target = 0; let animating = false;
  const max = () => Math.max(0, rail.scrollWidth - rail.clientWidth);
  const stopAnim = () => { animating = false; };
  const step = () => {
    if (!animating) return;
    const diff = target - rail.scrollLeft;
    if (Math.abs(diff) < 0.5) { rail.scrollLeft = target; animating = false; return; }
    rail.scrollLeft += diff * 0.2;
    requestAnimationFrame(step);
  };
  rail.addEventListener('scroll', () => updateRail(wrap), { passive: true });
  // Molette (souris) : défilement horizontal fluide. Aux extrémités, la page reprend la main.
  rail.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;
    const m = max(); if (m <= 0) return;
    const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 32 : 1);
    const base = animating ? target : rail.scrollLeft;
    if ((base <= 0 && d < 0) || (base >= m - 1 && d > 0)) return;
    e.preventDefault();
    target = Math.min(m, Math.max(0, base + d));
    if (!animating) { animating = true; requestAnimationFrame(step); }
  }, { passive: false });
  // Clavier
  rail.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault(); stopAnim();
      rail.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * rail.clientWidth * 0.8, behavior: 'smooth' });
    }
  });
  $('[data-prev]', wrap).addEventListener('click', () => { stopAnim(); rail.scrollBy({ left: -rail.clientWidth * 0.8, behavior: 'smooth' }); });
  $('[data-next]', wrap).addEventListener('click', () => { stopAnim(); rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: 'smooth' }); });
  // Barre : clic pour aller à un endroit, glisser le curseur
  track.addEventListener('click', (e) => {
    if (e.target === thumb) return;
    const r = track.getBoundingClientRect(); stopAnim();
    rail.scrollTo({ left: ((e.clientX - r.left) / r.width) * rail.scrollWidth - rail.clientWidth / 2, behavior: 'smooth' });
  });
  let drag = null;
  thumb.addEventListener('pointerdown', (e) => {
    stopAnim(); thumb.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, left: rail.scrollLeft };
  });
  thumb.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = track.getBoundingClientRect();
    rail.scrollLeft = drag.left + ((e.clientX - drag.x) / r.width) * rail.scrollWidth;
  });
  const end = () => { drag = null; };
  thumb.addEventListener('pointerup', end); thumb.addEventListener('pointercancel', end);
}

/* =========================================================
   Accueil
   ========================================================= */
function renderBand() {
  const items = [t('slogan'), t('band.leasing'), t('band.rent'), t('band.wash'), t('band.city')];
  const line = items.map((x) => `${esc(x)} <b>●</b>`).join(' ');
  $('#band').innerHTML = `${line} ${line}`;
}

function renderHomeRail() {
  const list = visibleLeasing();
  const featured = list.filter((v) => v.featured);
  const shown = (featured.length ? featured : list);
  $('[data-rail="home"] .rail').innerHTML = shown.length
    ? shown.map((v, i) => `<div class="slide reveal" style="--d:${i}">${leasingCard(v)}</div>`).join('')
    : `<p class="empty">${esc(t('leasing.empty'))}</p>`;
}

/* =========================================================
   Reprises de leasing
   ========================================================= */
function renderLeasingFilters() {
  const bodies = [...new Set(visibleLeasing().map((v) => v.body).filter(Boolean))];
  const fb = $('#fBody'); const keep = state.leasing.body;
  fb.innerHTML = `<option value="">${esc(t('filter.all'))}</option>${BODY_TYPES.filter((b) => bodies.includes(b)).map((b) => `<option value="${b}">${esc(t(`body.${b}`))}</option>`).join('')}`;
  fb.value = bodies.includes(keep) ? keep : '';
  state.leasing.body = fb.value;
  const fs = $('#fSort');
  fs.innerHTML = ['featured', 'price_asc', 'price_desc', 'km_asc', 'year_desc'].map((k) => `<option value="${k}">${esc(t(`sort.${k}`))}</option>`).join('');
  fs.value = state.leasing.sort;
}
function renderLeasingList() {
  const { body, sort } = state.leasing;
  let list = visibleLeasing().filter((v) => !body || v.body === body);
  const by = {
    featured: (a, b) => (b.featured - a.featured) || (a.status === 'reserved') - (b.status === 'reserved') || String(b.createdAt).localeCompare(String(a.createdAt)),
    price_asc: (a, b) => (hasVal(a.monthly) ? a.monthly : Infinity) - (hasVal(b.monthly) ? b.monthly : Infinity),
    price_desc: (a, b) => (hasVal(b.monthly) ? b.monthly : -1) - (hasVal(a.monthly) ? a.monthly : -1),
    km_asc: (a, b) => (a.km || 0) - (b.km || 0),
    year_desc: (a, b) => (b.year || 0) - (a.year || 0),
  };
  list = [...list].sort(by[sort] || by.featured);
  const rail = $('[data-rail="leasing"] .rail');
  rail.innerHTML = list.length
    ? list.map((v, i) => `<div class="slide reveal" style="--d:${i}">${leasingCard(v)}</div>`).join('')
    : `<p class="empty">${esc(t('leasing.empty'))}</p>`;
  rail.scrollLeft = 0;
  requestAnimationFrame(updateRails);
}

/* =========================================================
   Fiche véhicule (dialogue)
   ========================================================= */
function specRows(v) {
  return [
    ['spec.year', v.year],
    ['spec.firstReg', v.firstReg ? fmtMonth(v.firstReg) : null],
    ['spec.km', hasVal(v.km) ? `${num(v.km)} km` : null],
    ['spec.body', v.body ? t(`body.${v.body}`) : null],
    ['spec.fuel', v.fuel ? t(`fuel.${v.fuel}`) : null],
    ['spec.gearbox', v.gearbox ? t(`gearbox.${v.gearbox}`) : null],
    ['spec.drive', v.drive ? t(`drive.${v.drive}`) : null],
    ['spec.power', hasVal(v.powerHp) ? `${num(v.powerHp)} ${t('unit.hp')} (${num(Math.round(v.powerHp * 0.7355))} kW)` : null],
    ['spec.engine', hasVal(v.engineCc) ? `${num(v.engineCc)} cm³` : null],
    ['spec.seats', v.seats],
    ['spec.doors', v.doors],
    ['spec.luggage', hasVal(v.luggage) ? `${num(v.luggage)} ${t('unit.l')}` : null],
    ['spec.colorExt', v.colorExt],
    ['spec.colorInt', v.colorInt],
    ['spec.consumption', v.consumption],
    ['spec.co2', hasVal(v.co2) ? `${num(v.co2)} g/km` : null],
    ['spec.energyLabel', v.energyLabel],
  ].filter(([, val]) => hasVal(val));
}
const table = (rows) => `<div class="spec-table">${rows.map(([k, val]) => `<div><small>${esc(t(k))}</small><b>${esc(val)}</b></div>`).join('')}${rows.length % 2 ? '<div aria-hidden="true"></div>' : ''}</div>`;

function financingTerms(v) {
  return [
    ['lt.salePrice', hasVal(v.salePrice) ? chf(v.salePrice) : null],
    ['lt.monthlyDeposit', hasVal(v.monthly) ? `${num(v.monthly)} ${t('card.per_month')}` : null],
    ['lt.monthlyNoDeposit', hasVal(v.monthlyNoDeposit) ? `${num(v.monthlyNoDeposit)} ${t('card.per_month')}` : null],
    ['lt.downPayment', hasVal(v.downPayment) ? chf(v.downPayment) : (hasVal(v.monthly) && hasVal(v.monthlyNoDeposit) ? t('unit.on_request') : null)],
    ['lt.duration', hasVal(v.durationMonths) ? `${num(v.durationMonths)} ${t('unit.months')}` : null],
    ['lt.rate', hasVal(v.rate) ? `${num(v.rate)} %` : null],
    ['lt.kmPerYear', hasVal(v.kmPerYear) ? `${num(v.kmPerYear)} km` : null],
    ['lt.lessor', v.lessor || null],
    ['lt.warranty', hasVal(v.warrantyMonths) ? t('lt.warranty_v', { n: v.warrantyMonths }) : null],
  ].filter(([, x]) => hasVal(x));
}
function highlights(v) {
  return [v.swiss && 'hl.swiss', v.mfkFresh && 'hl.mfk', v.serviceFresh && 'hl.service', (v.warranty && !hasVal(v.warrantyMonths)) && 'hl.warranty'].filter(Boolean);
}
function leasingTerms(v) {
  if (isFin(v)) return financingTerms(v);
  return [
    ['lt.monthly', hasVal(v.monthly) ? `${num(v.monthly)} ${t('card.per_month')}` : null],
    ['lt.takeover', hasVal(v.takeover) ? chf(v.takeover) : null],
    ['lt.monthsLeft', hasVal(v.monthsLeft) ? `${num(v.monthsLeft)} ${t('unit.months')}` : null],
    ['lt.endDate', v.endDate ? fmtMonth(v.endDate) : null],
    ['lt.kmPerYear', hasVal(v.kmPerYear) ? `${num(v.kmPerYear)} km` : null],
    ['lt.transferFee', hasVal(v.transferFee) ? chf(v.transferFee) : null],
    ['lt.residual', hasVal(v.residual) ? chf(v.residual) : null],
  ].filter(([, x]) => hasVal(x));
}
function rentTerms(v) {
  const ex = extraKmOf(v);
  return [
    ...offersOf(v).map((o) => [`rt.${o.key}`, `${chf(o.price)} · ${num(o.km)} km${o.rule ? ` · ${t(`offer.rule_${o.rule}`)}` : ''}`]),
    ['rt.extraKm', ex === null ? t('unit.on_request') : chf(ex)],
    ['rt.deposit', chf(v.deposit || 0)],
    ['rt.minAge', hasVal(v.minAge) ? `${v.minAge} ${t('unit.years')}` : null],
    ['rt.license', hasVal(v.licenseYears) ? `${v.licenseYears} ${t(Number(v.licenseYears) === 1 ? 'unit.year' : 'unit.years')}` : null],
  ].filter(([, x]) => hasVal(x));
}

function renderGallery() {
  const { photos, i } = state.gallery;
  const g = $('#vehBody .gallery'); if (!g) return;
  $('.main', g).innerHTML = photos.length
    ? `<img src="${photos[i]}" alt="${esc(t('veh.photo', { i: i + 1, n: photos.length }))}">`
    : `${CAR_SVG}<span class="badges"><span></span><span class="badge">${esc(t('veh.no_photo'))}</span></span>`;
  $$('.thumbs button', g).forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
}

function openVehicle(kind, id) {
  const v = Store.get(kind === 'rental' ? 'rentals' : 'leasing', id);
  if (!v) return;
  state.gallery = { photos: photosOf(v), i: 0 };
  const photos = state.gallery.photos;
  const isL = kind === 'leasing';
  const eq = (v.equipment || []).filter(Boolean);
  const msg = `${t('wa.greeting')} ${vTitle(v)} ${v.version || ''}`.trim();
  $('#vehBody').innerHTML = `<div class="veh">
    <div class="gallery">
      <div class="main"></div>
      ${photos.length > 1 ? `<button class="nav-btn prev" type="button" data-g="-1" aria-label="${esc(t('rail.prev'))}">‹</button><button class="nav-btn next" type="button" data-g="1" aria-label="${esc(t('rail.next'))}">›</button>
        <div class="thumbs">${photos.map((p, k) => `<button type="button" data-gi="${k}" aria-label="${esc(t('veh.photo', { i: k + 1, n: photos.length }))}"><img src="${p}" alt=""></button>`).join('')}</div>` : ''}
    </div>
    <div class="veh-info">
      <p class="kicker">${isL ? 'AMA Concept' : 'AMARENT'} · ${esc(isL ? t(`offer_type.${isFin(v) ? 'financing' : 'takeover'}`) : t('nav.locations'))}</p>
      <h2 id="vehTitle">${esc(vTitle(v))}</h2>
      <p class="vsub">${esc(v.version || '')}</p>
      ${isL
        ? `<div class="veh-price">${hasVal(v.monthly) ? `${isFin(v) ? `<span class="muted">${esc(t('card.from'))}</span>` : ''}<b>${num(v.monthly)}</b><span class="muted">${esc(t('card.per_month'))}</span>` : `<b class="on-request">${esc(t('card.on_request'))}</b>`}${v.status === 'reserved' ? `<span class="pill reserved">${esc(t('status.reserved'))}</span>` : ''}</div>
           ${isFin(v) && hasVal(v.salePrice) ? `<p class="muted veh-cash">${esc(t('card.cash', { p: chf(v.salePrice) }))}</p>` : ''}
           ${highlights(v).length ? `<ul class="checks small hl">${highlights(v).map((k) => `<li>${esc(t(k))}</li>`).join('')}</ul>` : ''}`
        : `<div class="veh-price"><span class="muted">${esc(t('rent.from'))}</span><b>${num(v.priceDay)}</b><span class="muted">${esc(t('rent.per_day'))}</span></div>`}
      <h3>${esc(isL ? t(isFin(v) ? 'veh.fin_terms' : 'veh.leasing_terms') : t('veh.rent_terms'))}</h3>
      ${table(isL ? leasingTerms(v) : rentTerms(v))}
      <h3>${esc(t('veh.specs'))}</h3>
      ${table(specRows(v))}
      ${eq.length ? `<h3>${esc(t('veh.equipment'))}</h3><div class="chips">${eq.map((k) => `<span class="chip">${esc(t(`eq.${k}`))}</span>`).join('')}</div>` : ''}
      ${v.description ? `<h3>${esc(t('veh.description'))}</h3><p class="desc">${esc(v.description)}</p>` : ''}
      ${isL ? `<p class="fine">${esc(t('legal.lcd'))}</p>` : ''}
      <div class="veh-cta">
        ${isL
          ? `<a class="btn block" href="#contact?motif=leasing&v=${encodeURIComponent(v.id)}">${esc(t(isFin(v) ? 'card.request_fin' : 'card.request'))}</a>`
          : (v.status === 'available' ? `<a class="btn block" href="#locations?v=${encodeURIComponent(v.id)}">${esc(t('veh.book'))}</a>` : `<button class="btn block" type="button" disabled>${esc(t('rent.unavailable'))}</button>`)}
        <a class="btn ghost block" href="${waLink(CONFIG.whatsapp, msg)}" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </div>
  </div>`;
  renderGallery();
  const d = $('#vehDialog');
  if (!d.open) d.showModal();
  $('.veh-info', d).scrollTop = 0;
}

function setupDialogs() {
  $$('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('dialog.dialog').forEach((d) => {
    // clic sur le fond = fermeture
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    // un lien interne ferme la fenêtre avant la navigation
    d.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) d.close(); });
  });
  const vd = $('#vehDialog');
  vd.addEventListener('click', (e) => {
    const g = e.target.closest('[data-g]'); const gi = e.target.closest('[data-gi]');
    const n = state.gallery.photos.length; if (!n) return;
    if (g) state.gallery.i = (state.gallery.i + Number(g.dataset.g) + n) % n;
    if (gi) state.gallery.i = Number(gi.dataset.gi);
    if (g || gi) renderGallery();
  });
  vd.addEventListener('keydown', (e) => {
    const n = state.gallery.photos.length; if (n < 2) return;
    if (e.key === 'ArrowRight') { state.gallery.i = (state.gallery.i + 1) % n; renderGallery(); }
    if (e.key === 'ArrowLeft') { state.gallery.i = (state.gallery.i - 1 + n) % n; renderGallery(); }
  });
  $('#reviewDialog').addEventListener('close', () => {
    if (location.hash.startsWith('#avis')) history.replaceState(null, '', '#accueil');
  });
  // Ouverture des fiches depuis n'importe quelle carte
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) openVehicle(o.dataset.open, o.dataset.id);
  });
}

/* =========================================================
   Locations
   ========================================================= */
const kmDayOf = (r) => Number(r.kmPerDay) || Number(Store.settings().kmPerDay) || CONFIG.defaultKmPerDay;
function extraKmOf(r) {
  const v = hasVal(r.extraKm) ? r.extraKm : Store.settings().extraKm;
  return hasVal(v) ? Number(v) : null;
}
/**
 * Offres d'un véhicule.
 * days : jours facturés (durée annoncée) · span : jours bloqués au calendrier
 * starts : jours de départ autorisés (0 = dimanche … 6 = samedi), null = tous.
 */
function offersOf(r) {
  const kmDay = kmDayOf(r);
  const list = [];
  if (Number(r.priceDay) > 0) list.push({ key: 'day', days: 1, span: 1, price: Number(r.priceDay), km: kmDay, starts: r.dayWeekdaysOnly ? [1, 2, 3, 4, 5] : null, rule: r.dayWeekdaysOnly ? 'weekdays' : '' });
  if (Number(r.priceWeekend) > 0) {
    const fri = !!r.weekendFriday;
    list.push({ key: 'weekend', days: 2, span: fri ? 3 : 2, price: Number(r.priceWeekend), km: hasVal(r.kmWeekend) ? Number(r.kmWeekend) : 2 * kmDay, starts: fri ? [5] : null, rule: fri ? 'friday' : '' });
  }
  if (Number(r.priceWeek) > 0) list.push({ key: 'week', days: 7, span: 7, price: Number(r.priceWeek), km: 7 * kmDay, starts: null, rule: '' });
  return list;
}
const startAllowed = (o, d) => !o.starts || o.starts.includes(d.getDay());
function currentRental() {
  const list = visibleRentals();
  let r = list.find((x) => x.id === state.rent.id);
  if (!r) r = list.find((x) => x.status === 'available') || null;
  state.rent.id = r ? r.id : null;
  return r;
}
function currentOffer(r) {
  const os = offersOf(r);
  const o = os.find((x) => x.key === state.rent.offer) || os[0] || null;
  if (o) state.rent.offer = o.key;
  return o;
}
function eachDay(from, to, fn) {
  let d = fromISO(from); const end = fromISO(to || from); let guard = 0;
  while (d <= end && guard++ < 400) { fn(iso(d)); d = addDays(d, 1); }
}
function daySets(r) {
  const booked = new Set(); const pend = new Set();
  (r.blocked || []).forEach((b) => b.from && eachDay(b.from, b.to || b.from, (d) => booked.add(d)));
  Store.all('reservations').filter((x) => x.vehicleId === r.id && (x.status === 'pending' || x.status === 'confirmed'))
    .forEach((x) => eachDay(x.start, x.end, (d) => (x.status === 'confirmed' ? booked : pend).add(d)));
  return { booked, pend };
}
function rangeStatus(r, start, o) {
  const { booked, pend } = daySets(r);
  const list = Array.from({ length: o.span }, (_, i) => iso(addDays(start, i)));
  const past = start < today();
  const rule = !startAllowed(o, start);
  const clash = list.some((d) => booked.has(d) || pend.has(d));
  return { ok: !past && !clash && !rule, past, clash, rule, list };
}

function renderRentGrid() {
  const list = visibleRentals();
  const cur = currentRental();
  $('#rentGrid').innerHTML = list.length ? list.map((r) => {
    const sel = cur && r.id === cur.id; const off = r.status !== 'available';
    const badges = `<span>${off ? `<span class="badge warn">${esc(t('status.maintenance'))}</span>` : ''}</span><span>${r.body ? `<span class="badge">${esc(t(`body.${r.body}`))}</span>` : ''}</span>`;
    return `<article class="vcard rentcard ${sel ? 'on' : ''} ${off ? 'off' : ''}">
      ${vimg(r, badges, 'rental')}
      <div class="vbody">
        <h3>${esc(vTitle(r))}</h3>
        <p class="vsub">${esc(r.version || '')}</p>
        <div class="chips">
          ${r.gearbox ? `<span class="chip">${esc(t(`gearbox.${r.gearbox}`))}</span>` : ''}
          ${r.seats ? `<span class="chip">${esc(r.seats)} ${esc(t('spec.seats').toLowerCase())}</span>` : ''}
          ${r.fuel ? `<span class="chip">${esc(t(`fuel.${r.fuel}`))}</span>` : ''}
          ${offersOf(r).map((o) => `<span class="chip">${esc(t(`offer.${o.key}`))} · ${esc(t('offer.km', { n: num(o.km) }))}</span>`).join('')}
        </div>
        <div class="from"><small>${esc(t('rent.from'))}</small> ${num(r.priceDay)} <small>${esc(t('rent.per_day'))}</small></div>
        <div class="vactions mt">
          <button class="btn ghost sm" type="button" data-open="rental" data-id="${esc(r.id)}">${esc(t('card.details'))}</button>
          <button class="btn sm" type="button" data-pick="${esc(r.id)}" aria-pressed="${sel}" ${off ? 'disabled' : ''}>${esc(off ? t('rent.unavailable') : (sel ? t('rent.chosen') : t('rent.choose')))}</button>
        </div>
      </div>
    </article>`;
  }).join('') : `<p class="muted">${esc(t('rent.empty'))}</p>`;
}

function renderOffers() {
  const r = currentRental(); const box = $('#offers');
  if (!r) { box.innerHTML = ''; return; }
  const o = currentOffer(r);
  box.innerHTML = offersOf(r).map((x) => `<button class="offer" type="button" role="radio" aria-checked="${o && x.key === o.key}" data-offer="${x.key}">
      <b>${esc(t(`offer.${x.key}`))}</b>
      <small>${esc(x.key === 'week' ? tp('offer.days', x.days) : t('offer.hours', { n: x.days * 24 }))} · ${esc(t('offer.km', { n: num(x.km) }))}</small>
      ${x.rule ? `<small class="rule">${esc(t(`offer.rule_${x.rule}`))}</small>` : ''}
      <span class="op">${chf(x.price)}</span>
    </button>`).join('');
}

function renderCal() {
  const r = currentRental(); const box = $('#days');
  if (!r) { box.innerHTML = ''; $('#bookedList').innerHTML = ''; $('#monthLabel').textContent = ''; return; }
  const o = currentOffer(r);
  const t0 = today();
  if (!state.rent.cal) state.rent.cal = new Date(t0.getFullYear(), t0.getMonth(), 1);
  const y = state.rent.cal.getFullYear(); const m = state.rent.cal.getMonth();
  $('#monthLabel').textContent = state.rent.cal.toLocaleDateString(`${L()}-CH`, { month: 'long', year: 'numeric' });
  const { booked, pend } = daySets(r);
  const first = (new Date(y, m, 1).getDay() + 6) % 7; const count = new Date(y, m + 1, 0).getDate();
  const sel = state.rent.start && o ? rangeStatus(r, state.rent.start, o) : null;
  let html = t('cal.wd').split(',').map((d) => `<div class="wd" aria-hidden="true">${esc(d)}</div>`).join('');
  for (let i = 0; i < first; i++) html += '<div></div>';
  for (let d = 1; d <= count; d++) {
    const date = new Date(y, m, d); const s = iso(date);
    let cls = 'day'; let dis = false; let state2 = t('cal.available');
    if (date < t0) { cls += ' past'; dis = true; state2 = ''; }
    else if (booked.has(s)) { cls += ' booked'; dis = true; state2 = t('cal.booked'); }
    else if (pend.has(s)) { cls += ' pend'; dis = true; state2 = t('cal.pending'); }
    else if (o && !startAllowed(o, date)) { cls += ' norule'; dis = true; state2 = t(`offer.rule_${o.rule}`); }
    if (s === iso(t0)) cls += ' today';
    if (sel && sel.list.includes(s)) cls += sel.ok ? ' inrange' : ' inrange bad';
    if (state.rent.start && s === iso(state.rent.start)) cls += ' sel';
    const label = `${fmtDate(date, L(), { weekday: 'long', day: 'numeric', month: 'long' })}${state2 ? ` – ${state2}` : ''}`;
    html += `<button class="${cls}" type="button" data-day="${s}" aria-label="${esc(label)}" ${dis ? 'disabled' : ''}>${d}</button>`;
  }
  box.innerHTML = html;
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}-`;
  const inMonth = (set) => [...set].filter((s) => s.startsWith(prefix)).map((s) => Number(s.slice(8))).sort((a, b) => a - b);
  const bl = inMonth(booked); const pl = inMonth(pend);
  $('#bookedList').innerHTML = `<div><b>${esc(t('cal.booked_month'))} :</b> ${bl.length ? bl.join(', ') : esc(t('cal.none'))}</div>
    <div><b>${esc(t('cal.pending_month'))} :</b> ${pl.length ? pl.join(', ') : esc(t('cal.none'))}</div>`;
  const minMonth = new Date(t0.getFullYear(), t0.getMonth(), 1);
  $('#prevMonth').disabled = state.rent.cal <= minMonth;
  $('#nextMonth').disabled = state.rent.cal >= new Date(t0.getFullYear(), t0.getMonth() + 12, 1);
}

function renderSummary() {
  const r = currentRental(); const el = $('#sum');
  if (!r) { el.innerHTML = `<h3>${esc(t('sum.title'))}</h3><p>${esc(t('rent.empty'))}</p>`; return; }
  const o = currentOffer(r);
  const head = `<h3>${esc(t('sum.title'))}</h3><p>${esc(vTitle(r))} · ${esc(o ? t(`offer.${o.key}`) : '')}</p>`;
  if (!state.rent.start || !o) { el.innerHTML = `${head}<p>${esc(t('sum.pick'))}</p>`; return; }
  const st = rangeStatus(r, state.rent.start, o);
  const end = addDays(state.rent.start, o.span - 1);
  const dateTxt = o.span === 1
    ? fmtDate(state.rent.start, L(), { weekday: 'long', day: 'numeric', month: 'long' })
    : t('sum.range', { a: fmtDate(state.rent.start, L()), b: fmtDate(end, L()) });
  const ex = extraKmOf(r);
  el.innerHTML = `${head}
    <p><strong>${esc(dateTxt)}</strong> · ${esc(o.key === 'week' ? tp('offer.days', o.days) : t('offer.hours', { n: o.days * 24 }))}</p>
    <p>${esc(t('sum.km_offer', { n: num(o.km) }))}</p>
    <p>${esc(ex === null ? t('sum.extra_tbd') : t('sum.extra', { p: num(ex) }))}</p>
    ${st.ok ? `<div class="total">${chf(o.price)}</div><p>${esc(t('sum.pending'))}</p>`
      : `<p class="warn">${esc(st.past ? t('sum.past') : st.rule ? t(`offer.rule_${o.rule}`) : t('sum.unavailable'))}</p>`}`;
}

function renderLocations() { renderRentGrid(); renderOffers(); renderCal(); renderSummary(); }

function selectRental(id) {
  const r = Store.get('rentals', id);
  if (!r || r.status !== 'available') return;
  state.rent.id = id; state.rent.start = null;
  renderLocations();
  requestAnimationFrame(() => $('#offers').scrollIntoView({ behavior: 'smooth', block: 'center' }));
}

function setupLocations() {
  $('#rentGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]'); if (!b || b.disabled) return;
    state.rent.id = b.dataset.pick; state.rent.start = null; renderLocations();
  });
  $('#offers').addEventListener('click', (e) => {
    const b = e.target.closest('[data-offer]'); if (!b) return;
    state.rent.offer = b.dataset.offer;
    const r = currentRental(); const o = r && currentOffer(r);
    if (state.rent.start && o && !startAllowed(o, state.rent.start)) state.rent.start = null;
    renderOffers(); renderCal(); renderSummary();
  });
  $('#days').addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]'); if (!b || b.disabled) return;
    state.rent.start = fromISO(b.dataset.day); renderCal(); renderSummary();
    $(`[data-day="${b.dataset.day}"]`)?.focus();
  });
  $('#prevMonth').addEventListener('click', () => { const c = state.rent.cal; state.rent.cal = new Date(c.getFullYear(), c.getMonth() - 1, 1); renderCal(); });
  $('#nextMonth').addEventListener('click', () => { const c = state.rent.cal; state.rent.cal = new Date(c.getFullYear(), c.getMonth() + 1, 1); renderCal(); });

  $('#resaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget; const out = $('#resaMsg');
    const r = currentRental(); const o = r && currentOffer(r);
    const say = (txt, cls) => { out.className = `msg ${cls}`; out.textContent = txt; };
    if (!r || !o || !state.rent.start) { say(t('msg.pick_date'), 'err'); $('#days').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const st = rangeStatus(r, state.rent.start, o);
    if (!st.ok) { say(t('msg.unavailable'), 'err'); renderCal(); return; }
    if (!validate(form)) { say(t('msg.required'), 'err'); return; }
    const end = addDays(state.rent.start, o.span - 1);
    const res = Store.upsert('reservations', {
      vehicleId: r.id, vehicleLabel: `${vTitle(r)} ${r.version || ''}`.trim(), offer: o.key, days: o.days,
      start: iso(state.rent.start), end: iso(end), total: o.price, kmIncluded: o.km,
      client: { name: $('#rName').value.trim(), tel: $('#rTel').value.trim(), email: $('#rMail').value.trim() },
      note: $('#rNote').value.trim(), lang: L(), status: 'pending',
    });
    form.reset(); state.rent.start = null;
    say(t('msg.rent_ok'), 'ok');
    toast(t('toast.rent_ok'), 'success');
    if (!res.ok) console.warn('Stockage local indisponible : la demande ne sera pas conservée.');
    renderCal(); renderSummary();
  });
}

/* =========================================================
   Wash
   ========================================================= */
function containsSeq(arr, seq) {
  outer: for (let i = 0; i <= arr.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) if (arr[i + j] !== seq[j]) continue outer;
    return true;
  }
  return false;
}
/** Détecte la catégorie à partir du modèle saisi (correspondance par mots entiers, la plus précise gagne). */
export function detectCat(text) {
  const tk = tokens(text); if (!tk.length) return { cat: null };
  const joined = tk.join('');
  let best = null;
  for (const m of Store.all('washModels')) {
    const mt = tokens(m.model); if (!mt.length) continue;
    const mj = mt.join('');
    if (containsSeq(tk, mt) || tk.includes(mj) || (mt.length > 1 && joined.includes(mj) && mj.length >= 3)) {
      const brandHit = tokens(m.brand).every((b) => tk.includes(b)) || joined.includes(norm(m.brand));
      const score = mj.length * 10 + (brandHit ? 5 : 0);
      if (!best || score > best.score) best = { cat: m.cat, score, m };
    }
  }
  if (best) return { cat: best.cat, match: best.m };
  const brand = Store.all('washModels').map((m) => m.brand).find((b) => joined.includes(norm(b)));
  return { cat: null, brand: brand || null };
}

const washServices = () => Store.all('washServices').filter((s) => s.active);
function lockedBy(id) { return washServices().find((s) => state.wash.sel.includes(s.id) && (s.includes || []).includes(id)) || null; }

function renderWash() {
  $('#modelList').innerHTML = Store.all('washModels').map((m) => `<option value="${esc(`${m.brand} ${m.model}`)}"></option>`).join('');
  $('#catBtns').innerHTML = ['citadine', 'berline', 'suv'].map((c) => `<button class="catbtn" type="button" role="radio" aria-checked="${state.wash.cat === c}" data-cat="${c}">${esc(t(`cat.${c}`))}</button>`).join('');
  const cat = state.wash.cat;
  state.wash.sel = state.wash.sel.filter((id) => washServices().some((s) => s.id === id));
  $('#svcs').innerHTML = washServices().map((s, i) => {
    const on = state.wash.sel.includes(s.id); const lock = lockedBy(s.id);
    const dis = !cat || !!lock;
    return `<button class="panel svc reveal" style="--d:${i}" type="button" data-svc="${s.id}" aria-pressed="${on}" ${dis ? 'disabled' : ''}>
      <span class="tick" aria-hidden="true">✓</span>
      <h3>${esc(t(`svc.${s.id}`))}</h3>
      <p>${esc(t(`svc.${s.id}_d`))}</p>
      <div class="p">${cat ? chf(s.prices[cat]) : '—'} <small>${cat ? `· ${esc(t(`cat.${cat}`))}` : ''}</small></div>
      ${lock ? `<span class="inc">${esc(t('wash.included'))}</span>` : ''}
    </button>`;
  }).join('');
  const sel = washServices().filter((s) => state.wash.sel.includes(s.id));
  $('#basketTxt').textContent = !cat ? t('wash.pick_cat') : (sel.length ? sel.map((s) => t(`svc.${s.id}`)).join(' + ') : t('wash.none'));
  $('#basketTotal').textContent = chf(cat ? sel.reduce((a, s) => a + Number(s.prices[cat] || 0), 0) : 0);
  const addr = Store.settings().address;
  $('#wPlace').value = addr ? `${t('wash.place_v')} · ${addr}` : t('wash.place_v');
  $('#wDate').min = iso(today());
}

function setupWash() {
  $('#wDetectForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = $('#wModel').value.trim(); const box = $('#wDetected');
    if (!val) { box.innerHTML = `<p class="hint">${esc(t('wash.empty_model'))}</p>`; return; }
    const r = detectCat(val);
    if (r.cat) {
      state.wash.cat = r.cat;
      box.innerHTML = `<p class="mt"><span class="chip">${esc(t('wash.detected', { c: t(`cat.${r.cat}`) }))} · ${esc(`${r.match.brand} ${r.match.model}`)}</span></p>`;
    } else if (r.brand) {
      box.innerHTML = `<p class="msg err">${esc(t('wash.brand_only', { b: r.brand }))}</p>`;
    } else {
      box.innerHTML = `<p class="msg err">${esc(t('wash.unknown'))}</p>`;
    }
    renderWash();
  });
  $('#catBtns').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    state.wash.cat = b.dataset.cat; renderWash();
  });
  $('#svcs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-svc]'); if (!b || b.disabled) return;
    const s = washServices().find((x) => x.id === b.dataset.svc); if (!s) return;
    const sel = state.wash.sel;
    if (sel.includes(s.id)) state.wash.sel = sel.filter((x) => x !== s.id);
    else state.wash.sel = [...sel.filter((x) => !(s.includes || []).includes(x)), s.id]; // une formule combinée remplace ses composants
    renderWash();
  });
  $('#washForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget; const out = $('#washMsg');
    const say = (txt, cls) => { out.className = `msg ${cls}`; out.textContent = txt; };
    const cat = state.wash.cat; const sel = washServices().filter((s) => state.wash.sel.includes(s.id));
    if (!cat) { say(t('msg.wash_cat'), 'err'); return; }
    if (!sel.length) { say(t('msg.wash_svc'), 'err'); return; }
    if (!validate(form)) { say(t('msg.required'), 'err'); return; }
    Store.upsert('washRequests', {
      model: $('#wModel').value.trim(), cat, services: sel.map((s) => s.id), total: sel.reduce((a, s) => a + Number(s.prices[cat] || 0), 0),
      date: $('#wDate').value, slot: $('#wSlot').value, client: { name: $('#wName').value.trim(), tel: $('#wTel').value.trim() },
      note: $('#wNote').value.trim(), lang: L(), status: 'pending',
    });
    form.reset(); state.wash.sel = [];
    say(t('msg.wash_ok'), 'ok'); toast(t('toast.wash_ok'), 'success');
    renderWash();
  });
}

/* =========================================================
   Contact
   ========================================================= */
const hoursHTML = (s) => (s.open247 ? `<span>${esc(t('hours.always'))}</span>` : (s.hours ? `<span style="white-space:pre-line">${esc(s.hours)}</span>` : ''));
const igLinks = () => CONFIG.instagram.map((x) => `<a href="https://www.instagram.com/${encodeURIComponent(x.handle)}/" target="_blank" rel="noopener">@${esc(x.handle)} <small class="muted">· ${esc(t(`ig.${x.activity}`))}</small></a>`).join('');
function renderContact() {
  const m = $('#cMotif'); const keepM = m.value;
  m.innerHTML = `<option value="">${esc(t('contact.motif_ph'))}</option>${MOTIFS.map((k) => `<option value="${k}">${esc(t(`motif.${k}`))}</option>`).join('')}`;
  m.value = keepM;
  const v = $('#cVeh'); const keepV = v.value;
  v.innerHTML = `<option value="">${esc(t('contact.none'))}</option>
    <optgroup label="${esc(t('contact.g_rent'))}">${visibleRentals().map((r) => `<option value="${esc(r.id)}">${esc(`${vTitle(r)} ${r.version || ''}`)}</option>`).join('')}</optgroup>
    <optgroup label="${esc(t('contact.g_leasing'))}">${visibleLeasing().map((r) => `<option value="${esc(r.id)}">${esc(`${vTitle(r)} ${r.version || ''}`)}</option>`).join('')}</optgroup>`;
  v.value = keepV;
  const s = Store.settings();
  const tbd = `<span>${esc(t('contact.tbd'))}</span>`;
  $('#contactInfo').innerHTML = `
    <div class="ci"><div class="ico" aria-hidden="true">☎</div><div><b>${esc(t('contact.phone'))}</b><a href="tel:${CONFIG.phoneIntl}">${CONFIG.phoneDisplay}</a><span>${esc(t('contact.phone_sub'))}</span></div></div>
    <div class="ci"><div class="ico" aria-hidden="true">@</div><div><b>${esc(t('contact.email'))}</b>${s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : tbd}</div></div>
    <div class="ci"><div class="ico" aria-hidden="true">⌂</div><div><b>${esc(t('contact.address'))}</b>${s.address ? `<span>${esc(s.address)}</span>` : `<span>Genève · ${esc(t('contact.tbd'))}</span>`}</div></div>
    <div class="ci"><div class="ico" aria-hidden="true">◷</div><div><b>${esc(t('contact.hours'))}</b>${hoursHTML(s) || tbd}</div></div>
    <div class="ci"><div class="ico" aria-hidden="true">IG</div><div><b>Instagram</b>${igLinks()}</div></div>`;
  $('#footerContact').innerHTML = `<a href="tel:${CONFIG.phoneIntl}">${CONFIG.phoneDisplay}</a>
    <a href="${waLink(CONFIG.whatsapp, t('wa.greeting'))}" target="_blank" rel="noopener">WhatsApp</a>
    ${s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ''}
    ${CONFIG.instagram.map((x) => `<a href="https://www.instagram.com/${encodeURIComponent(x.handle)}/" target="_blank" rel="noopener">Instagram @${esc(x.handle)}</a>`).join('')}
    <p>${s.address ? esc(s.address) : 'Genève, Suisse'}</p>
    ${hoursHTML(s) ? `<p>${hoursHTML(s)}</p>` : ''}`;
}
function setupContact() {
  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget; const out = $('#cMsgOut');
    if (!validate(form)) { out.className = 'msg err'; out.textContent = t('msg.required'); return; }
    const vid = $('#cVeh').value;
    const veh = vid ? (Store.get('rentals', vid) || Store.get('leasing', vid)) : null;
    Store.upsert('messages', {
      name: $('#cName').value.trim(), email: $('#cMail').value.trim(), tel: $('#cTel').value.trim(),
      motif: $('#cMotif').value, vehicleId: vid || null, vehicleLabel: veh ? `${vTitle(veh)} ${veh.version || ''}`.trim() : '',
      message: $('#cMsg').value.trim(), lang: L(), status: 'new',
    });
    form.reset(); out.className = 'msg ok'; out.textContent = t('contact.ok'); toast(t('toast.contact_ok'), 'success');
  });
}

/* =========================================================
   Avis clients
   ========================================================= */
function renderReviews() {
  const pub = Store.all('reviews').filter((r) => r.status === 'published').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const avg = pub.length ? pub.reduce((a, r) => a + Number(r.rating), 0) / pub.length : 0;
  const avgTxt = num(Math.round(avg * 10) / 10);
  $('#reviewSummary').innerHTML = pub.length ? `<b>${avgTxt}</b>${starsHTML(avg, t('reviews.on5', { r: avgTxt }))}<span>${esc(tp('reviews.count', pub.length))}</span>` : '';
  $('#reviewList').innerHTML = pub.length ? pub.slice(0, 6).map((r) => `<article class="panel review">
      ${starsHTML(r.rating, t('reviews.on5', { r: r.rating }))}
      <p>${esc(r.text)}</p>
      <footer><b>${esc(r.name)}</b><span>${esc(t(`rv.s_${r.service}`))} · ${esc(fmtDate(new Date(r.createdAt), L(), { month: 'short', year: 'numeric' }))}</span></footer>
    </article>`).join('') : `<p class="panel review-empty">${esc(t('reviews.empty'))}</p>`;
  const g = Store.settings().googleReviewUrl; const gb = $('#googleReviewBtn');
  if (g && /^https:\/\//.test(g)) { gb.href = g; gb.classList.remove('hidden'); } else gb.classList.add('hidden');
}

function renderStars() {
  $('#starsPick').innerHTML = [1, 2, 3, 4, 5].map((n) => `<input type="radio" name="rvStar" id="rvS${n}" value="${n}" ${state.rating === n ? 'checked' : ''}><label for="rvS${n}" class="${n <= state.rating ? 'on' : ''}" aria-label="${esc(t('rv.star', { n }))}">★</label>`).join('');
}
function openReview() {
  const d = $('#reviewDialog');
  $('#rvMsg').textContent = ''; $('#rvMsg').className = 'msg';
  renderStars();
  if (!d.open) d.showModal();
}
function setupReviews() {
  const pick = $('#starsPick');
  pick.addEventListener('change', (e) => { state.rating = Number(e.target.value); renderStars(); $(`#rvS${state.rating}`).focus(); });
  pick.addEventListener('mouseover', (e) => { const l = e.target.closest('label'); if (!l) return; const n = Number(l.htmlFor.slice(3)); $$('label', pick).forEach((x, i) => x.classList.toggle('on', i < n)); });
  pick.addEventListener('mouseleave', () => $$('label', pick).forEach((x, i) => x.classList.toggle('on', i < state.rating)));
  $('#reviewForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const out = $('#rvMsg'); const say = (txt, cls) => { out.className = `msg ${cls}`; out.textContent = txt; };
    if (!state.rating) { say(t('rv.need_rating'), 'err'); return; }
    if ($('#rvText').value.trim().length < 10) { $('#rvText').setAttribute('aria-invalid', 'true'); say(t('rv.min_text'), 'err'); return; }
    if (!validate(e.currentTarget)) { say(t('msg.required'), 'err'); return; }
    Store.upsert('reviews', { name: $('#rvName').value.trim(), rating: state.rating, service: $('#rvService').value, text: $('#rvText').value.trim(), lang: L(), status: 'pending' });
    e.currentTarget.reset(); state.rating = 0; renderStars();
    const g = Store.settings().googleReviewUrl;
    out.className = 'msg ok';
    out.innerHTML = `${esc(t('rv.thanks'))}${g && /^https:\/\//.test(g) ? `<br>${esc(t('rv.share_google'))} <a href="${esc(g)}" target="_blank" rel="noopener">Google</a>` : ''}`;
  });
}

/* =========================================================
   Formulaires : validation accessible
   ========================================================= */
function validate(form) {
  let first = null;
  $$('input,select,textarea', form).forEach((el) => {
    if (el.disabled || el.readOnly || el.type === 'radio') return;
    let bad = !el.checkValidity();
    if (!bad && el.type === 'tel' && el.value.trim()) bad = el.value.replace(/\D/g, '').length < 9;
    el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (bad && !first) first = el;
  });
  if (first) { first.focus(); return false; }
  return true;
}
document.addEventListener('input', (e) => { if (e.target.getAttribute?.('aria-invalid') === 'true') e.target.setAttribute('aria-invalid', 'false'); });

/* =========================================================
   Cookies, WhatsApp, langue, menu
   ========================================================= */
function setupCookies() {
  const bar = $('#cookieBar');
  const has = safeStorage.get(CONFIG.consentKey);
  bar.hidden = !!has;
  const save = (stats) => { safeStorage.set(CONFIG.consentKey, JSON.stringify({ v: 1, stats, at: new Date().toISOString() })); bar.hidden = true; };
  $('#cookieAccept').addEventListener('click', () => save(true));
  $('#cookieNecessary').addEventListener('click', () => save(false));
  $('#cookieSettings').addEventListener('click', () => { bar.hidden = false; $('#cookieNecessary').focus(); });
}
function renderWa() {
  const a = $('#waFab'); a.href = waLink(CONFIG.whatsapp, t('wa.greeting'));
}
function setupLang() {
  $$('.lang [data-lang]').forEach((b) => b.addEventListener('click', () => {
    setLang(b.dataset.lang); applyI18n(); renderAll(); updateTitle();
    if (state.page === 'legal') renderLegalPage(state.legalKey);
  }));
}
function syncLangButtons() { $$('.lang [data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === L()))); }
function closeMenu() { $('#nav').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false'); }
function setupMenu() {
  $('#burger').addEventListener('click', () => {
    const open = !$('#nav').classList.contains('open');
    $('#nav').classList.toggle('open', open); $('#burger').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
}

/* =========================================================
   Routage
   ========================================================= */
function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
  const [p, q = ''] = raw.split('?');
  return { p: p || 'accueil', params: new URLSearchParams(q) };
}
function updateTitle() {
  const key = state.page === 'legal' ? 'title.legal' : `title.${state.page || 'accueil'}`;
  document.title = `${t(key)} | AMA Concept`;
  const md = $('meta[name="description"]'); if (md) md.content = t('meta.desc');
}
function renderLegalPage(key) {
  renderLegal($('#legalContent'), key, Store.settings());
  $('#legalLangNotice').classList.toggle('hidden', L() === 'fr');
}
async function route() {
  const { p, params } = parseHash();
  let section = p; let after = null;
  if (p === 'avis') { section = 'accueil'; after = () => { $('#reviewsBlock').scrollIntoView({ block: 'start' }); openReview(); }; }
  else if (LEGAL.includes(p)) section = 'legal';
  else if (!PAGES.includes(p)) section = 'accueil';
  const changed = state.page !== section || section === 'legal';
  const leavingAdmin = state.page === 'admin' && section !== 'admin';
  state.page = section;
  if (leavingAdmin) renderAll();
  $$('.page').forEach((s) => s.classList.toggle('on', s.id === section));
  $$('.nav a').forEach((a) => (a.dataset.route === section ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  closeMenu();
  document.body.classList.toggle('admin-mode', section === 'admin');
  if (section === 'legal') { state.legalKey = p; renderLegalPage(p); }
  if (section === 'admin') {
    try { const mod = await import('./admin.js'); mod.mountAdmin($('#adminRoot')); }
    catch (err) { console.error(err); $('#adminRoot').innerHTML = '<p class="wrap" style="padding:60px 0">Impossible de charger l\'espace partenaire.</p>'; }
  }
  if (section === 'contact') {
    const motif = params.get('motif'); const v = params.get('v');
    if (motif && MOTIFS.includes(motif)) $('#cMotif').value = motif;
    if (v) $('#cVeh').value = v;
  }
  updateTitle();
  if (changed && !after) window.scrollTo({ top: 0, behavior: 'auto' });
  if (section === 'locations' && params.get('v')) selectRental(params.get('v'));
  requestAnimationFrame(updateRails);
  if (after) after();
}

/* =========================================================
   Rendu global
   ========================================================= */
function renderAll() {
  syncLangButtons();
  renderBand();
  renderHomeRail();
  renderLeasingFilters();
  renderLeasingList();
  renderLocations();
  renderWash();
  renderContact();
  renderReviews();
  renderWa();
  requestAnimationFrame(updateRails);
}

function init() {
  Store.init();
  initLang();
  applyI18n();
  $('#year').textContent = new Date().getFullYear();
  $$('[data-rail]').forEach(initRail);
  setupDialogs(); setupLocations(); setupWash(); setupContact(); setupReviews(); setupCookies(); setupLang(); setupMenu();
  $('#fBody').addEventListener('change', (e) => { state.leasing.body = e.target.value; renderLeasingList(); });
  $('#fSort').addEventListener('change', (e) => { state.leasing.sort = e.target.value; renderLeasingList(); });
  renderAll();
  // Toute modification des données (espace partenaire, autre onglet) met le site à jour.
  Store.subscribe(() => { if (state.page !== 'admin') renderAll(); });
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', () => requestAnimationFrame(updateRails));
  route();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

// Exposé pour l'espace partenaire (rafraîchir le site public après modifications).
export { renderAll };
