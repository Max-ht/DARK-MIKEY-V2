/**
 * utils/viewOnceHandler.js
 * Logique partagée entre /vv (manuel) et /autovv (automatique) :
 * télécharge un média vue-unique et l'envoie vers "Vous" + Telegram.
 */
const { downloadContentFromMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');
const tg = require('./telegram');

/** Vérifie si un message contient un média vue-unique. */
function isViewOnce(msg) {
  const m = msg?.message;
  if (!m) return false;
  return !!(
    m.viewOnceMessageV2 ||
    m.viewOnceMessageV2Extension ||
    m.viewOnceMessage ||
    m.viewOnce ||
    m?.imageMessage?.viewOnce ||
    m?.videoMessage?.viewOnce ||
    m?.audioMessage?.viewOnce
  );
}

/** Extrait le message réel depuis les wrappers vue-unique. */
function unwrap(quotedOrMsg) {
  let m = quotedOrMsg;
  if (m.viewOnceMessageV2Extension) m = m.viewOnceMessageV2Extension.message;
  else if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
  else if (m.viewOnceMessage) m = m.viewOnceMessage.message;
  return m;
}

/**
 * Télécharge et renvoie un média vue-unique.
 * @param {object} sock        - Socket Baileys
 * @param {object} rawMsg      - Message brut (pour /autovv) ou msg de la commande (pour /vv)
 * @param {object} quotedMsgObj - quotedMessage extrait (pour /vv) ou null (pour /autovv)
 * @param {string} senderJid   - JID de l'expéditeur
 * @param {string} sourceChat  - JID du chat source
 * @param {string} groupName   - Nom du groupe (ou null si privé)
 * @param {string} originalCaption - Légende originale
 */
async function processAndForward(sock, rawMsg, quotedMsgObj, senderJid, sourceChat, groupName, originalCaption) {
  const selfJid = jidNormalizedUser(sock.user.id);
  const senderNum = String(senderJid || '').split('@')[0].split(':')[0];

  // Ligne d'info expéditeur
  const where = groupName ? `groupe *${groupName}*` : 'discussion privée';
  const infoLine = `👁️ *Vue unique* de *+${senderNum}* (${where})`;
  const caption = originalCaption
    ? `${infoLine}\n\n📝 ${originalCaption}`
    : infoLine;

  // Résoudre le message réel à télécharger
  let actualMsg = null;
  let mtype = null;

  if (quotedMsgObj) {
    // Mode /vv : on a le quotedMessage
    const unwrapped = unwrap(quotedMsgObj);
    const types = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
    for (const t of types) {
      if (unwrapped[t]) { actualMsg = unwrapped; mtype = t; break; }
    }
  } else {
    // Mode autovv : le message lui-même est vue-unique
    const unwrapped = unwrap(rawMsg.message);
    const types = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
    for (const t of types) {
      if (unwrapped[t]) { actualMsg = unwrapped; mtype = t; break; }
    }
  }

  if (!actualMsg || !mtype) {
    await sock.sendMessage(selfJid, { text: `${infoLine}\n\n❓ Type de média non reconnu.` }, {});
    return false;
  }

  const mediaInfo = actualMsg[mtype];
  const stream = await downloadContentFromMessage(mediaInfo, mtype.replace('Message', ''));
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  // Envoi WhatsApp → "Vous"
  if (mtype === 'imageMessage') {
    await sock.sendMessage(selfJid, { image: buffer, caption }, {});
    await tg.sendMedia(buffer, 'image', caption, 'image.jpg');
  } else if (mtype === 'videoMessage') {
    await sock.sendMessage(selfJid, { video: buffer, caption }, {});
    await tg.sendMedia(buffer, 'video', caption, 'video.mp4');
  } else if (mtype === 'audioMessage') {
    const ptt = mediaInfo?.ptt ?? true;
    await sock.sendMessage(selfJid, { audio: buffer, ptt, mimetype: 'audio/ogg; codecs=opus' }, {});
    await tg.sendText(caption);
    await tg.sendMedia(buffer, 'audio', caption, 'audio.ogg');
  } else {
    await sock.sendMessage(selfJid, { document: buffer, caption, mimetype: mediaInfo?.mimetype || 'application/octet-stream' }, {});
    await tg.sendMedia(buffer, 'document', caption, 'file');
  }

  return true;
}

module.exports = { isViewOnce, processAndForward, unwrap };
