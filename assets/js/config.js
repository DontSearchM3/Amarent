/**
 * Configuration métier AMA Concept.
 * Tout ce qui est propre à l'entreprise est centralisé ici.
 */
export const CONFIG = Object.freeze({
  brand: 'AMA Concept',
  phoneDisplay: '077 918 15 27',
  phoneIntl: '+41779181527',
  whatsapp: '41779181527',
  /** Comptes Instagram par activité. */
  instagram: [
    { handle: 'amaconcept.ge', brand: 'AMA Concept', activity: 'leasing' },
    { handle: 'amarent.ge', brand: 'AMARENT', activity: 'rent' },
    { handle: 'amawash.ch', brand: 'AMAWASH', activity: 'wash' },
  ],
  storageKey: 'amaconcept-demo-v4',
  langKey: 'amaconcept-lang',
  consentKey: 'amaconcept-consent',
  adminSessionKey: 'amaconcept-admin-demo',
  defaultKmPerDay: 150,
  languages: ['fr', 'en', 'de'],
});

/** Listes de référence (les libellés sont traduits dans i18n.js). */
export const BODY_TYPES = ['citadine', 'compacte', 'berline', 'break', 'suv', 'coupe', 'cabriolet', 'monospace', 'utilitaire', 'moto'];
export const FUELS = ['essence', 'diesel', 'hybride', 'hybride_rech', 'electrique'];
export const GEARBOXES = ['auto', 'manuelle'];
export const DRIVES = ['traction', 'propulsion', 'integrale'];
export const ENERGY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const EQUIPMENT = [
  'clim', 'clim_auto', 'gps', 'carplay', 'android_auto', 'bluetooth', 'camera', 'camera360', 'radar',
  'regulateur', 'acc', 'sieges_chauffants', 'sieges_electriques', 'cuir', 'toit_pano', 'toit_ouvrant',
  'led', 'jantes', 'attelage', 'keyless', 'hayon', 'audio', 'hud', 'lane', 'lane_change', 'angle_mort', 'front_assist', 'traffic_sign', 'park_assist', 'proactive', 'attention', 'paddles', 'chargeur_induction',
];
/** Catégories de prix AMAWASH. */
export const WASH_CATS = ['citadine', 'berline', 'suv'];

/** Statuts. */
/** Type d'offre leasing : reprise d'un contrat existant ou véhicule proposé en leasing / financement. */
export const OFFER_TYPES = ['financing', 'takeover'];
export const LEASING_STATUS = ['available', 'reserved', 'taken', 'hidden'];
export const RENTAL_STATUS = ['available', 'maintenance', 'hidden'];
export const REQUEST_STATUS = ['pending', 'confirmed', 'refused', 'cancelled', 'done'];
