/**
 * /vv - Révèle un message à vue unique (manuel, owner only)
 */
const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const { processAndForward } = require('../../utils/viewOnceHandler');

module.exports = {
  name: 'viewonce',
  aliases: ['vv', 'readvo', 'vueunique', 'read'],
  category: 'general',
  description: "Révèle un message à vue unique et l'envoie dans Vous + Telegram",
  usage: '/vv (répondre à un message vue unique)',
  ownerOnly: true,

  async execute(sock, msg, args) {
    const selfJid = jidNormalizedUser(sock.user.id);
    const sourceChat = msg.key.remoteJid;

    const ctx =
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo ||
      msg.message?.audioMessage?.contextInfo ||
      msg.message?.buttonsResponseMessage?.contextInfo;

    if (!ctx?.quotedMessage || !ctx?.stanzaId) {
      return await sock.sendMessage(selfJid, {
        text: '📌 Réponds à un message *vue unique* avec */vv* pour le révéler.'
      }, {});
    }

    const quotedMsg = ctx.quotedMessage;
    const hasVO =
      !!quotedMsg.viewOnceMessageV2 ||
      !!quotedMsg.viewOnceMessageV2Extension ||
      !!quotedMsg.viewOnceMessage ||
      !!quotedMsg.viewOnce ||
      !!quotedMsg?.imageMessage?.viewOnce ||
      !!quotedMsg?.videoMessage?.viewOnce ||
      !!quotedMsg?.audioMessage?.viewOnce;

    if (!hasVO) {
      return await sock.sendMessage(selfJid, {
        text: "❌ Ce message n'est pas un message à vue unique."
      }, {});
    }

    // Déterminer l'expéditeur réel
    let senderJid;
    if (sourceChat.endsWith('@g.us')) {
      senderJid = ctx.participant || ctx.remoteJid || sourceChat;
    } else {
      const selfNum = String(selfJid).split('@')[0].split(':')[0];
      const chatNum = String(sourceChat).split('@')[0].split(':')[0];
      senderJid = (chatNum !== selfNum) ? sourceChat : (ctx.participant || sourceChat);
    }

    // Nom du groupe si applicable
    let groupName = null;
    if (sourceChat.endsWith('@g.us')) {
      try {
        const meta = await sock.groupMetadata(sourceChat);
        groupName = meta.subject;
      } catch { groupName = 'Groupe'; }
    }

    // Légende originale
    const unwrapped = quotedMsg.viewOnceMessageV2?.message
      || quotedMsg.viewOnceMessageV2Extension?.message
      || quotedMsg.viewOnceMessage?.message
      || quotedMsg;

    let originalCaption = '';
    for (const t of ['imageMessage','videoMessage','audioMessage','documentMessage']) {
      if (unwrapped[t]?.caption) { originalCaption = unwrapped[t].caption; break; }
    }

    try {
      await processAndForward(sock, msg, quotedMsg, senderJid, sourceChat, groupName, originalCaption);
    } catch (err) {
      console.error('[/vv]', err.message);
      await sock.sendMessage(selfJid, {
        text: '❌ Erreur lors de la révélation : ' + err.message
      }, {});
    }
  }
};
