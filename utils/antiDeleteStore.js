/**
 * utils/antiDeleteStore.js
 * Store en mémoire pour les discussions/groupes où /antidelete est activé.
 */
const enabled = new Set();

module.exports = {
  enable: (jid) => enabled.add(jid),
  disable: (jid) => enabled.delete(jid),
  isEnabled: (jid) => enabled.has(jid),
  toggle: (jid) => {
    if (enabled.has(jid)) { enabled.delete(jid); return false; }
    enabled.add(jid); return true;
  },
  hasAny: () => enabled.size > 0,
  list: () => [...enabled],
};
