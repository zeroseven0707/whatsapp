const {
    default: makeWASocket,
    downloadContentFromMessage,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
  } = require("@whiskeysockets/baileys"),
  mime = require("mime-types");
const fs = require("fs"),
  { join } = require("path"),
  { default: axios } = require("axios");
function formatReceipt(strings) {
  try {
    if (strings.endsWith("@g.us")) {
      return strings;
    }
    let stringsEnd = strings.replace(/\D/g, "");
    return (
      stringsEnd.startsWith("0") && (stringsEnd = "62" + stringsEnd.substr(1)),
      !stringsEnd.endsWith("@c.us") && (stringsEnd += "@c.us"),
      stringsEnd
    );
  } catch (error) {
    return strings;
  }
}
async function asyncForEach(strings, resSync) {
  for (let i = 0; i < strings.length; i++) {
    await resSync(strings[i], i, strings);
  }
}
async function commandbiddenCharacters(strings) {
  return strings.replace(/[\x00-\x1F\x7F-\x9F'\\"]/g, "");
}
async function parseIncomingMessage(strings) {
  const resultKey = Object.keys(strings.message || {})[0],
    resStrings =
      resultKey === "conversation" && strings.message.conversation
        ? strings.message.conversation
        : resultKey == "imageMessage" && strings.message.imageMessage.caption
        ? strings.message.imageMessage.caption
        : resultKey == "videoMessage" && strings.message.videoMessage.caption
        ? strings.message.videoMessage.caption
        : resultKey == "extendedTextMessage" &&
          strings.message.extendedTextMessage.text
        ? strings.message.extendedTextMessage.text
        : resultKey == "messageContextInfo" &&
          strings.message.listResponseMessage?.title
        ? strings.message.listResponseMessage.title
        : resultKey == "messageContextInfo"
        ? strings.message.buttonsResponseMessage.selectedDisplayText
        : "",
    resultChart = resStrings.toLowerCase(),
    command = await commandbiddenCharacters(resultChart),
    pushStr = strings?.pushName || "",
    from = strings.key.remoteJid.split("@")[0];
  let bufferImage;
  if (resultKey === "imageMessage") {
    const BhffTo = await downloadContentFromMessage(
      strings.message.imageMessage,
      "image"
    );
    let buffIm = Buffer.from([]);
    for await (const BuffFrom of BhffTo) {
      buffIm = Buffer.concat([buffIm, BuffFrom]);
    }
    bufferImage = buffIm.toString("base64");
  } else {
    urlImage = null;
  }
  return {
    command: command,
    bufferImage: bufferImage,
    from: from,
  };
}
function getSavedPhoneNumber(savnum) {
  return new Promise((savTim, errSav) => {
    const promSav = savnum;
    promSav
      ? setTimeout(() => {
          savTim(promSav);
        }, 2000)
      : errSav(new Error("Nomor telepon tidak ditemukan."));
  });
}
const prepareMediaMessage = async (upload, url) => {
  try {
    const prepWa = await prepareWAMessageMedia(
        { [url.mediatype]: { url: url.media } },
        { upload: upload.waUploadToServer }
      ),
      urlImg = url.mediatype + "Message";
    if (url.mediatype === "document" && !url.fileName) {
      const regImg = new RegExp(/.*\/(.+?)\./),
        fileReg = regImg.exec(url.media);
      url.fileName = fileReg[1];
    }
    mimetype = mime.lookup(url.media);
    if (!mimetype) {
      const headImg = await axios.head(url.media);
      mimetype = headImg.headers["content-type"];
    }
    url.media.includes(".cdr") && (mimetype = "application/cdr");
    prepWa[urlImg].caption = url?.caption;
    prepWa[urlImg].mimetype = mimetype;
    prepWa[urlImg].fileName = url.fileName;
    url.mediatype === "video" &&
      ((prepWa[urlImg].jpegThumbnail = Uint8Array.from(
        fs.readFileSync(
          join(process.cwd(), "public", "images", "video-cover.png")
        )
      )),
      (prepWa[urlImg].gifPlayback = false));
    let userJid = upload.user.id.replace(/:\d+/, "");
    return await generateWAMessageFromContent(
      "",
      { [urlImg]: { ...prepWa[urlImg] } },
      { userJid: userJid }
    );
  } catch (error) {
    return console.log("error prepare", error), false;
  }
};
module.exports = {
  formatReceipt: formatReceipt,
  asyncForEach: asyncForEach,
  commandbiddenCharacters: commandbiddenCharacters,
  parseIncomingMessage: parseIncomingMessage,
  getSavedPhoneNumber: getSavedPhoneNumber,
  prepareMediaMessage: prepareMediaMessage,
};
