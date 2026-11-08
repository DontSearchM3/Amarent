/** Utilitaires partagés (sans dépendance). */

/** Échappe une valeur pour une insertion sûre dans du HTML. */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

/** Normalise un texte pour la recherche (minuscules, sans accents ni ponctuation). */
export const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
export const tokens = (s) => String(s ?? '').split(/[\s\-_/.,]+/).map(norm).filter(Boolean);

/** Nombre au format suisse selon la langue (ex. 38’000). */
export const fmtNum = (n, lang = 'fr') => (n === null || n === undefined || n === '' || Number.isNaN(Number(n)))
  ? '—'
  : Number(n).toLocaleString(`${lang}-CH`, { maximumFractionDigits: 2 });

export const fmtDate = (d, lang = 'fr', opts = { day: 'numeric', month: 'long' }) =>
  (d instanceof Date ? d : fromISO(d)).toLocaleDateString(`${lang}-CH`, opts);

/** Numéro suisse -> format international pour wa.me (076... -> 4176...). */
export function toWa(phone) {
  let d = String(phone ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `41${d.slice(1)}`;
  return d;
}
export const waLink = (phone, text = '') => `https://wa.me/${toWa(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export function debounce(fn, ms = 200) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** Accès au stockage local protégé (peut être indisponible ou plein). */
export const safeStorage = {
  get(k, fallback = null) { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  remove(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
export const safeSession = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } },
  remove(k) { try { sessionStorage.removeItem(k); } catch { /* ignore */ } },
};

/** Notification éphémère accessible (aria-live). */
export function toast(text, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.dataset.type = type;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 3200);
}

/** Redimensionne une image côté client avant stockage (JPEG). */
export async function resizeImage(file, max = 1024, quality = 0.76) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } finally { URL.revokeObjectURL(url); }
}

/** N'accepte que des images encodées localement ou les fichiers du site (évite toute injection d'URL). */
export const safeImg = (src) => (typeof src === 'string'
  && (/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(src) || /^assets\/img\/[a-z0-9/_-]+\.(webp|jpe?g|png)$/i.test(src)) ? src : '');

/** Silhouette de voiture utilisée quand aucune photo n'est disponible. */
export const CAR_SVG = `<svg class="car-svg" viewBox="0 0 240 96" aria-hidden="true" focusable="false">
  <path d="M14 66c0-7 5-12 12-13l24-4 27-21c7-5 14-7 22-7h44c9 0 17 3 23 9l20 18 31 5c8 1 13 7 13 14v6c0 3-2 5-5 5h-15a23 23 0 0 0-45 0H84a23 23 0 0 0-45 0H19c-3 0-5-2-5-5z" fill="none" stroke="#5b8cff" stroke-width="3" stroke-linejoin="round"/>
  <path d="M86 30h34v20H62zM128 30h22c6 0 11 2 15 6l13 14h-50z" fill="rgba(47,107,255,.14)" stroke="#5b8cff" stroke-width="2"/>
  <circle cx="61" cy="73" r="15" fill="#0b1222" stroke="#5b8cff" stroke-width="3"/><circle cx="61" cy="73" r="5" fill="#2f6bff"/>
  <circle cx="186" cy="73" r="15" fill="#0b1222" stroke="#5b8cff" stroke-width="3"/><circle cx="186" cy="73" r="5" fill="#2f6bff"/>
</svg>`;

/** Étoiles de notation (affichage). */
export function starsHTML(rating, label = '') {
  const r = Math.round(Number(rating) * 2) / 2;
  let out = '';
  for (let i = 1; i <= 5; i++) out += `<span class="star ${r >= i ? 'full' : r >= i - 0.5 ? 'half' : ''}" aria-hidden="true">★</span>`;
  return `<span class="stars" role="img" aria-label="${esc(label || `${r}/5`)}">${out}</span>`;
}

/** Téléchargement d'un fichier généré (export CSV / JSON). */
export function download(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

export function toCSV(rows) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\n');
}

/** Boîte de confirmation non bloquante basée sur <dialog>. */
export function confirmDialog(message, { ok = 'Confirmer', cancel = 'Annuler', danger = false } = {}) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dialog dialog-sm';
    d.innerHTML = `<div class="dialog-body"><p class="confirm-text">${esc(message)}</p>
      <div class="dialog-actions"><button class="btn ghost" value="cancel" type="button">${esc(cancel)}</button>
      <button class="btn ${danger ? 'danger' : ''}" value="ok" type="button">${esc(ok)}</button></div></div>`;
    document.body.appendChild(d);
    const done = (v) => { d.close(); d.remove(); resolve(v); };
    d.querySelector('[value="ok"]').addEventListener('click', () => done(true));
    d.querySelector('[value="cancel"]').addEventListener('click', () => done(false));
    d.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
    d.showModal();
    d.querySelector('[value="ok"]').focus();
  });
}
