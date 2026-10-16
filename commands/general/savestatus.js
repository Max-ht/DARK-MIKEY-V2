/**
 * /savestatus - Sauvegarde un statut WhatsApp (répondre au statut)
 */
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'savestatus',
  aliases: ['status', 'savestory', 'statut'],
  category: 'general',
  description: 'Sauvegarde un statut WhatsApp (réponds à un statut)',
  usage: '/savestatus (répondre à un statut)',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    try {
      const ctx = msg.message?.extendedTextMessage?.contextInfo
        || msg.message?.imageMessage?.contextInfo
        || msg.message?.videoMessage?.contextInfo;

      if (!ctx?.quotedMessage) {
        return await extra.reply('📌 *Utilisation :* Réponds à un statut avec */savestatus*');
      }

      const quoted = ctx.quotedMessage;
      const mtype = Object.keys(quoted).find(k =>
        ['imageMessage','videoMessage','audioMessage','documentMessage'].includes(k)
      );

      if (!mtype) {
        // Statut texte
        const text = quoted.conversation || quoted.extendedTextMessage?.text || '';
        return await sock.sendMessage(chatId, {
          text: `📋 *Statut texte sauvegardé :*\n\n${text}`
        }, { quoted: msg });
      }

      // Reconstruire un faux message pour télécharger
      const fakeMsg = { message: quoted, key: { remoteJid: ctx.remoteJid || 'status@broadcast', fromMe: false, id: ctx.stanzaId } };
      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
      const caption = quoted[mtype]?.caption || '';

      if (mtype === 'imageMessage') {
        await sock.sendMessage(chatId, { image: buffer, caption: `📸 Statut sauvegardé${caption ? '\n' + caption : ''}` }, { quoted: msg });
      } else if (mtype === 'videoMessage') {
        await sock.sendMessage(chatId, { video: buffer, caption: `🎬 Statut sauvegardé${caption ? '\n' + caption : ''}` }, { quoted: msg });
      } else if (mtype === 'audioMessage') {
        await sock.sendMessage(chatId, { audio: buffer, ptt: false }, { quoted: msg });
      } else {
        await sock.sendMessage(chatId, { document: buffer, mimetype: quoted[mtype]?.mimetype || 'application/octet-stream', fileName: 'statut' }, { quoted: msg });
      }
    } catch (err) {
      console.error('[savestatus]', err.message);
      await extra.reply('❌ Impossible de sauvegarder ce statut. Assure-toi de répondre directement à un statut.');
    }
  }
};
