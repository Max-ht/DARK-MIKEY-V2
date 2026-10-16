/**
 * utils/autoVVStore.js
 * Store en mémoire pour la liste des discussions privées où /autovv est activé.
 * (Éphémère : se réinitialise à chaque redémarrage, ce qui est attendu sur Render.)
 */
const enabled = new Set();

module.exports = {
  enable: (jid) => enabled.add(jid),
  disable: (jid) => enabled.delete(jid),
  isEnabled: (jid) => enabled.has(jid),
  /** Bascule l'état. Retourne true si activé, false si désactivé. */
  toggle: (jid) => {
    if (enabled.has(jid)) { enabled.delete(jid); return false; }
    enabled.add(jid); return true;
  },
  list: () => [...enabled],
};
