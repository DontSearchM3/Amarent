/**
 * Pages légales (en français ; version qui fait foi).
 * Base de travail à faire valider par un juriste avant la mise en ligne.
 * Les passages <span class="tbd"> sont à compléter.
 */
import { CONFIG } from './config.js';
import { esc } from './utils.js';

const TBD = (txt = 'à compléter') => `<span class="tbd">[${esc(txt)}]</span>`;
const UPDATED = '6 novembre 2026';

function company(settings) {
  return {
    address: settings.address ? esc(settings.address) : TBD('adresse complète'),
    email: settings.email ? `<a href="mailto:${esc(settings.email)}">${esc(settings.email)}</a>` : TBD('adresse e-mail'),
    phone: `<a href="tel:${CONFIG.phoneIntl}">${CONFIG.phoneDisplay}</a>`,
  };
}

const DISCLAIMER = `<p class="disclaimer"><strong>Document de travail.</strong> Ce texte est une base rédigée pour le site. Il doit être complété (passages surlignés) et validé par un juriste avant la mise en ligne.</p>`;

function mentions(s) {
  const c = company(s);
  return `
  <h1>Mentions légales</h1>
  <p class="updated">Dernière mise à jour : ${UPDATED}</p>
  ${DISCLAIMER}
  <h2>Éditeur du site</h2>
  <p><strong>AMA Concept</strong> ${TBD('forme juridique : raison individuelle, Sàrl, SA…')}<br>
  ${c.address}<br>
  Numéro IDE : CHE-${TBD('numéro')}<br>
  Inscription au registre du commerce du canton de Genève : ${TBD('à confirmer')}<br>
  Téléphone : ${c.phone}<br>
  E-mail : ${c.email}</p>
  <p>Responsable de la publication : Mustapha Yildrim ${TBD('fonction')}.</p>

  <h2>Activités et marques</h2>
  <p>AMARENT (reprises de leasing et location de véhicules) et AMAWASH (lavage et soin de véhicules) sont des activités d'AMA Concept ${TBD('préciser : sociétés distinctes ou raisons de commerce d\'AMA Concept')}.</p>

  <h2>Hébergement</h2>
  <p>${TBD('hébergeur et adresse – prévu : Firebase Hosting, Google')}</p>

  <h2>Propriété intellectuelle</h2>
  <p>L'ensemble des contenus de ce site (textes, logos, photographies, éléments graphiques) est protégé par le droit d'auteur et le droit des marques. Toute reproduction, même partielle, est interdite sans l'autorisation écrite préalable d'AMA Concept.</p>

  <h2>Exactitude des informations</h2>
  <p>Les informations publiées (véhicules, caractéristiques, prix, disponibilités) sont fournies à titre indicatif et peuvent être modifiées à tout moment. Seule la confirmation écrite d'AMA Concept et le contrat signé engagent les parties. AMA Concept ne peut être tenue responsable d'une erreur matérielle ou d'une indisponibilité temporaire du site.</p>

  <h2>Liens externes</h2>
  <p>Le site peut contenir des liens vers des sites tiers (par exemple WhatsApp, Google). AMA Concept n'exerce aucun contrôle sur leur contenu et décline toute responsabilité à leur égard.</p>

  <h2>Droit applicable et for</h2>
  <p>Le présent site est soumis au droit suisse. Le for est à Genève, sous réserve des fors impératifs prévus par la loi, notamment en faveur des consommateurs.</p>`;
}

function cgv(s) {
  const c = company(s);
  return `
  <h1>Conditions générales</h1>
  <p class="updated">Dernière mise à jour : ${UPDATED}</p>
  ${DISCLAIMER}

  <h2>1. Champ d'application</h2>
  <p>Les présentes conditions générales (ci-après « CG ») s'appliquent aux prestations proposées par AMA Concept, ${c.address}, sous les marques AMARENT (location de véhicules et reprises de leasing) et AMAWASH (lavage et soin de véhicules). En envoyant une demande depuis ce site, le client déclare avoir pris connaissance des présentes CG et les accepter.</p>

  <h2>2. Demandes en ligne et conclusion du contrat</h2>
  <p>Les demandes envoyées depuis le site (réservation de véhicule, demande de reprise, demande de lavage) ne constituent pas un contrat. Le contrat est conclu uniquement lorsqu'AMA Concept confirme la demande par écrit (e-mail, SMS ou message). AMA Concept est libre d'accepter ou de refuser une demande, sans avoir à motiver sa décision.</p>
  <p>Les prix sont indiqués en francs suisses (CHF), ${TBD('TVA incluse / non assujetti')}.</p>

  <h2>3. Location de véhicules (AMARENT)</h2>
  <h3>3.1 Conditions relatives au conducteur</h3>
  <ul>
    <li>Âge minimum : 18 ans, ou l'âge indiqué sur la fiche du véhicule s'il est supérieur.</li>
    <li>Permis de conduire valable pour la catégorie du véhicule, détenu depuis la durée indiquée sur la fiche du véhicule.</li>
    <li>Présentation d'une pièce d'identité valable et ${TBD('justificatif de domicile, autres documents')}.</li>
  </ul>
  <h3>3.2 Caution</h3>
  <p>Aucune caution n'est demandée aux clients domiciliés en Suisse (0 CHF). Pour les autres clients : ${TBD('montant et modalités')}.</p>
  <h3>3.3 Kilométrage</h3>
  <p>150 km sont inclus par jour de location, sauf indication contraire sur la fiche du véhicule. Chaque kilomètre supplémentaire est facturé ${TBD('tarif')} CHF.</p>
  <h3>3.4 Prise en charge et restitution</h3>
  <p>Un état des lieux est établi contradictoirement à la remise et à la restitution du véhicule. Le véhicule doit être restitué à la date, à l'heure et au lieu convenus, avec le même niveau de carburant ou de charge. Tout retard ou complément de carburant est facturé selon ${TBD('barème')}.</p>
  <h3>3.5 Utilisation du véhicule</h3>
  <p>Le véhicule ne peut être conduit que par le locataire et les conducteurs annoncés et acceptés par AMA Concept. Sont notamment interdits : la sous-location, le transport de personnes ou de marchandises contre rémunération, la participation à des courses ou essais, la conduite sous l'influence de l'alcool, de stupéfiants ou de médicaments altérant la capacité de conduire. ${TBD('Sortie de Suisse : autorisée / soumise à accord / interdite')}. ${TBD('Véhicule non-fumeur et animaux')}.</p>
  <h3>3.6 Assurance, dommages et amendes</h3>
  <p>Les véhicules sont assurés ${TBD('couvertures')}. En cas de dommage, une franchise de ${TBD('montant')} CHF reste à la charge du locataire, sauf en cas de faute grave ou de violation des présentes CG, où le locataire répond de l'entier du dommage. Les amendes, frais de stationnement, péages et frais administratifs liés à l'utilisation du véhicule pendant la location sont à la charge du locataire.</p>
  <h3>3.7 Annulation</h3>
  <p>${TBD('conditions et frais d\'annulation par le client')}</p>
  <h3>3.8 Contrat de location</h3>
  <p>Un contrat de location est signé à la remise du véhicule. En cas de divergence, il prévaut sur les présentes CG.</p>

  <h2>4. Reprises de leasing (AMARENT)</h2>
  <h3>4.1 Annonces</h3>
  <p>Les annonces de reprise sont établies sur la base des informations disponibles au moment de la publication (mensualité, durée restante, kilométrage autorisé, montant de reprise, frais). Elles sont indicatives et peuvent évoluer jusqu'à la conclusion du transfert.</p>
  <h3>4.2 Conditions</h3>
  <p>La reprise d'un leasing suppose notamment un âge minimum de 18 ans, une résidence en Suisse et une solvabilité suffisante. Le transfert est soumis à l'accord de la société de leasing, qui procède à ses propres vérifications, notamment à l'examen de la capacité de contracter un crédit selon la loi fédérale sur le crédit à la consommation (LCC).</p>
  <h3>4.3 Rôle d'AMA Concept</h3>
  <p>AMA Concept met en relation le client et ${TBD('le preneur de leasing actuel / la société de leasing')} et l'accompagne dans les démarches. ${TBD('Préciser si AMA Concept est partie au contrat ou intermédiaire')}. Le contrat de leasing est conclu entre le client et la société de leasing.</p>
  <h3>4.4 Frais</h3>
  <p>Le montant de reprise et les frais de transfert indiqués dans l'annonce sont dus selon ${TBD('modalités')}.</p>
  <p><strong>L'octroi d'un crédit est interdit s'il occasionne le surendettement du consommateur (art. 3 LCD).</strong></p>

  <h2>5. Lavage et soin (AMAWASH)</h2>
  <ul>
    <li>Les prestations sont réalisées uniquement sur place chez AMAWASH, à la date et au créneau confirmés.</li>
    <li>Le tarif dépend de la catégorie du véhicule (citadine, berline, SUV). La catégorie indiquée en ligne est une estimation ; elle est confirmée à l'arrivée du véhicule.</li>
    <li>Le client retire ses objets personnels et de valeur avant la prestation. AMAWASH n'en répond pas.</li>
    <li>Les dommages préexistants (rayures, éclats, pièces fragilisées) sont signalés avant la prestation. AMAWASH répond uniquement des dommages causés par sa faute.</li>
    <li>Retard ou annulation : ${TBD('conditions')}.</li>
  </ul>

  <h2>6. Paiement</h2>
  <p>${TBD('moyens de paiement acceptés, échéances, acompte éventuel')}</p>

  <h2>7. Responsabilité</h2>
  <p>La responsabilité d'AMA Concept est limitée aux dommages causés intentionnellement ou par négligence grave, dans les limites autorisées par la loi.</p>

  <h2>8. Protection des données</h2>
  <p>Le traitement des données personnelles est décrit dans la <a href="#confidentialite">politique de confidentialité</a>.</p>

  <h2>9. Modifications</h2>
  <p>AMA Concept peut modifier les présentes CG à tout moment. La version applicable est celle en vigueur au moment de la demande.</p>

  <h2>10. Droit applicable et for</h2>
  <p>Les présentes CG sont soumises au droit suisse. Le for est à Genève, sous réserve des fors impératifs prévus par la loi, notamment en faveur des consommateurs.</p>`;
}

function privacy(s) {
  const c = company(s);
  return `
  <h1>Politique de confidentialité</h1>
  <p class="updated">Dernière mise à jour : ${UPDATED}</p>
  ${DISCLAIMER}
  <p>La présente politique explique comment AMA Concept traite vos données personnelles, conformément à la loi fédérale sur la protection des données (LPD). Lorsque le règlement général sur la protection des données de l'Union européenne (RGPD) s'applique, les droits qu'il prévoit vous sont également garantis.</p>

  <h2>1. Responsable du traitement</h2>
  <p>AMA Concept, ${c.address}<br>E-mail : ${c.email} · Téléphone : ${c.phone}</p>

  <h2>2. Données traitées</h2>
  <ul>
    <li><strong>Demandes de réservation, de reprise ou de lavage :</strong> nom, téléphone, e-mail, véhicule ou modèle concerné, dates, créneau, remarques.</li>
    <li><strong>Formulaire de contact :</strong> nom, e-mail, téléphone (facultatif), motif, véhicule concerné, message.</li>
    <li><strong>Avis clients :</strong> prénom ou initiales, note, texte, prestation concernée.</li>
    <li><strong>Données techniques :</strong> adresse IP, type de navigateur, date et heure d'accès, enregistrées par l'hébergeur pour la sécurité et le bon fonctionnement du site.</li>
    <li><strong>Préférences enregistrées dans votre navigateur :</strong> langue choisie et choix relatif aux cookies.</li>
  </ul>

  <h2>3. Finalités</h2>
  <ul>
    <li>Traiter et confirmer vos demandes, établir et exécuter les contrats.</li>
    <li>Vous contacter par e-mail, SMS, téléphone ou WhatsApp au sujet de votre demande.</li>
    <li>Publier votre avis, uniquement avec votre consentement.</li>
    <li>Assurer la sécurité du site et prévenir les abus.</li>
    <li>Respecter nos obligations légales, notamment de conservation des pièces comptables.</li>
  </ul>
  <p>Vos données ne sont ni vendues ni utilisées à des fins publicitaires sans votre consentement.</p>

  <h2>4. Destinataires et sous-traitants</h2>
  <p>Vos données sont accessibles uniquement aux personnes d'AMA Concept qui en ont besoin, ainsi qu'aux prestataires suivants, qui les traitent pour notre compte :</p>
  <ul>
    <li>hébergement du site et base de données : ${TBD('prévu : Google Firebase')} ;</li>
    <li>envoi des e-mails et SMS de confirmation : ${TBD('prestataire')} ;</li>
    <li>WhatsApp (Meta), si vous choisissez de nous contacter par ce moyen ;</li>
    <li>pour une reprise de leasing : la société de leasing concernée, avec votre accord.</li>
  </ul>

  <h2>5. Communication à l'étranger</h2>
  <p>Certains prestataires peuvent traiter des données hors de Suisse, notamment dans l'Union européenne ou aux États-Unis. Dans ce cas, la communication a lieu vers un État dont la législation assure un niveau de protection adéquat, ou sur la base de garanties appropriées, comme les clauses contractuelles types reconnues.</p>

  <h2>6. Durée de conservation</h2>
  <ul>
    <li>Demandes sans suite : ${TBD('24 mois, à confirmer')}.</li>
    <li>Contrats et pièces comptables : 10 ans, conformément au Code des obligations.</li>
    <li>Avis publiés : jusqu'à votre demande de retrait.</li>
  </ul>

  <h2>7. Vos droits</h2>
  <p>Vous pouvez demander l'accès à vos données, leur rectification ou leur effacement, vous opposer à un traitement, retirer votre consentement à tout moment et demander la remise de vos données dans un format courant. Pour exercer vos droits, écrivez à ${c.email}. Vous pouvez également adresser une réclamation au Préposé fédéral à la protection des données et à la transparence (PFPDT).</p>

  <h2>8. Cookies et stockage local</h2>
  <p>Le site enregistre dans votre navigateur uniquement les informations nécessaires à son fonctionnement : la langue choisie et votre choix relatif aux cookies. Aucun traceur publicitaire n'est utilisé. Des mesures d'audience ${TBD('outil')} ne seront activées qu'avec votre accord. Vous pouvez modifier votre choix à tout moment via le lien « Paramètres des cookies » en bas de page.</p>

  <h2>9. Sécurité</h2>
  <p>Nous prenons des mesures techniques et organisationnelles adaptées pour protéger vos données : connexion chiffrée (HTTPS), accès à l'espace de gestion limité aux personnes autorisées et protégé par authentification, sauvegardes régulières.</p>

  <h2>10. Modifications</h2>
  <p>Cette politique peut être mise à jour. La version publiée sur ce site fait foi.</p>`;
}

const PAGES = { 'mentions-legales': mentions, cgv, confidentialite: privacy };

/** Affiche une page légale. Contenu statique de confiance. */
export function renderLegal(container, key, settings) {
  const fn = PAGES[key] || mentions;
  container.innerHTML = fn(settings || {});
}
