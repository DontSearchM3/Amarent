/**
 * Configuration métier AMA Concept.
 * Tout ce qui est propre à l'entreprise est centralisé ici.
 */
export const CONFIG = Object.freeze({
  brand: 'AMA Concept',
  phoneDisplay: '076 625 85 80',
  phoneIntl: '+41766258580',
  whatsapp: '41766258580',
  snapchat: ['amaconcept.ge', 'amawash.ge'],
  storageKey: 'amaconcept-demo-v2',
  langKey: 'amaconcept-lang',
  consentKey: 'amaconcept-consent',
  adminSessionKey: 'amaconcept-admin-demo',
  defaultKmPerDay: 150,
  languages: ['fr', 'en', 'de'],
});

/** Listes de référence (les libellés sont traduits dans i18n.js). */
export const BODY_TYPES = ['citadine', 'berline', 'break', 'suv', 'coupe', 'cabriolet', 'monospace', 'utilitaire', 'moto'];
export const FUELS = ['essence', 'diesel', 'hybride', 'hybride_rech', 'electrique'];
export const GEARBOXES = ['auto', 'manuelle'];
export const DRIVES = ['traction', 'propulsion', 'integrale'];
export const ENERGY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const EQUIPMENT = [
  'clim', 'clim_auto', 'gps', 'carplay', 'android_auto', 'bluetooth', 'camera', 'camera360', 'radar',
  'regulateur', 'acc', 'sieges_chauffants', 'sieges_electriques', 'cuir', 'toit_pano', 'toit_ouvrant',
  'led', 'jantes', 'attelage', 'keyless', 'hayon', 'audio', 'hud', 'lane', 'angle_mort', 'chargeur_induction',
];
/** Catégories de prix AMAWASH. */
export const WASH_CATS = ['citadine', 'berline', 'suv'];

/** Statuts. */
export const LEASING_STATUS = ['available', 'reserved', 'taken', 'hidden'];
export const RENTAL_STATUS = ['available', 'maintenance', 'hidden'];
export const REQUEST_STATUS = ['pending', 'confirmed', 'refused', 'cancelled', 'done'];
