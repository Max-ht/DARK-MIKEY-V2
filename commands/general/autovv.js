/**
 * /autovv - Active/désactive l'interception automatique des vues uniques
 * en discussion privée uniquement (owner only).
 */
const autoVVStore = require('../../utils/autoVVStore');

module.exports = {
  name: 'autovv',
  aliases: ['avv', 'autovueunique'],
  category: 'general',
  description: 'Active/désactive l\'interception auto des vues uniques (privé seulement)',
  usage: '/autovv',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    const selfJid = String(sock.user.id).split(':')[0] + '@s.whatsapp.net';

    // Groupes interdits
    if (chatId.endsWith('@g.us')) {
      return await sock.sendMessage(chatId, {
        text: '❌ */autovv* fonctionne uniquement dans les discussions privées.'
      }, { quoted: msg });
    }

    const nowEnabled = autoVVStore.toggle(chatId);

    // Message de confirmation uniquement dans "Vous"
    const emoji = nowEnabled ? '✅' : '🔕';
    const état = nowEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ';
    const num = String(chatId).split('@')[0].split(':')[0];
    await sock.sendMessage(selfJid, {
      text: `${emoji} *Auto-VV ${état}*\n📱 Discussion : +${num}`
    }, {});

    // Message visible dans la discussion pour informer l'autre personne
    await sock.sendMessage(chatId, {
      text: `${emoji} *L'interception automatique des vues uniques est ${état}.*`
    }, {});
  }
};
