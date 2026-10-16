/**
 * /antidelete - Active/désactive la récupération des messages supprimés.
 * Fonctionne dans les groupes et les discussions privées.
 * Les messages récupérés sont envoyés dans le chat "Vous" du bot.
 */
const antiDeleteStore = require('../../utils/antiDeleteStore');

module.exports = {
  name: 'antidelete',
  aliases: ['antisupprime', 'antidel', 'nodel'],
  category: 'admin',
  description: 'Active/désactive la récupération des messages supprimés',
  usage: '/antidelete',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    const selfJid = String(sock.user.id).split(':')[0] + '@s.whatsapp.net';
    const nowEnabled = antiDeleteStore.toggle(chatId);
    const emoji = nowEnabled ? '🛡️' : '🔓';
    const état = nowEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ';

    // Nom de la discussion pour le message de confirmation
    let nomChat;
    if (chatId.endsWith('@g.us')) {
      try {
        const meta = await sock.groupMetadata(chatId);
        nomChat = `groupe *${meta.subject}*`;
      } catch {
        nomChat = 'ce groupe';
      }
    } else {
      const num = String(chatId).split('@')[0].split(':')[0];
      nomChat = `discussion +${num}`;
    }

    // Confirmation dans "Vous"
    await sock.sendMessage(selfJid, {
      text: `${emoji} *Anti-suppression ${état}*\n📍 Portée : ${nomChat}`
    }, {});

    // Confirmation visible dans la discussion/groupe
    await sock.sendMessage(chatId, {
      text: `${emoji} *La récupération des messages supprimés est ${état} dans cette discussion.*`
    }, {});
  }
};
