const {
  parseIncomingMessage,
  formatReceipt,
  prepareMediaMessage,
} = require("../lib/helper");
require("dotenv").config();
const axios = require("axios"),
  {
    isExistsEqualCommand,
    isExistsContainCommand,
    getUrlWebhook,
  } = require("../database/model"),
  IncomingMessage = async (response, socket) => {
    try {
      let isQuoted = false;
      if (!response.messages) {
        return;
      }
      response = response.messages[0];
      const pushNa = response?.pushName || "";
      if (response.key.fromMe === true) {
        return;
      }
      if (response.key.remoteJid === "status@broadcast") {
        return;
      }
      const participant =
          response.key.participant && formatReceipt(response.key.participant),
        {
          command: command,
          bufferImage: bufferImage,
          from: from,
        } = await parseIncomingMessage(response);
      let messages, isExCon;
      const webHooks = socket.user.id.split(":")[0],
        isExEq = await isExistsEqualCommand(command, webHooks);
      isExEq.length > 0
        ? (isExCon = isExEq)
        : (isExCon = await isExistsContainCommand(command, webHooks));
      if (isExCon.length === 0) {
        const url = await getUrlWebhook(webHooks);
        if (url == null) {
          return;
        }
        const sendWeho = await sendWebhook({
          command: command,
          bufferImage: bufferImage,
          from: from,
          url: url,
          participant: participant,
        });
        if (sendWeho === false) {
          return;
        }
        if (sendWeho === undefined) {
          return;
        }
        if (typeof sendWeho != "object") {
          return;
        }
        isQuoted = sendWeho?.quoted ? true : false;
        messages = JSON.stringify(sendWeho);
      } else {
        replyorno =
          isExCon[0].reply_when == "All"
            ? true
            : isExCon[0].reply_when == "Group" &&
              response.key.remoteJid.includes("@g.us")
            ? true
            : isExCon[0].reply_when == "Personal" &&
              !response.key.remoteJid.includes("@g.us")
            ? true
            : false;
        if (replyorno === false) {
          return;
        }
        isQuoted = isExCon[0].is_quoted ? true : false;
        typeof isExCon[0].reply === "object"
          ? (messages = JSON.stringify(isExCon[0].reply))
          : (messages = isExCon[0].reply);
      }
      messages = messages.replace(/{name}/g, pushNa);
      messages = JSON.parse(messages);
      if ("type" in messages) {
        let remoteJid = socket.user.id.replace(/:\d+/, "");
        if (messages.type == "audio") {
          return await socket.sendMessage(response.key.remoteJid, {
            audio: { url: messages.url },
            ptt: true,
            mimetype: "audio/mpeg",
          });
        }
        const resPrep = await prepareMediaMessage(socket, {
            caption: messages.caption ? messages.caption : "",
            fileName: messages.filename,
            media: messages.url,
            mediatype:
              messages.type !== "video" && messages.type !== "image"
                ? "document"
                : messages.type,
          }),
          messaged = { ...resPrep.message };
        return await socket.sendMessage(
          response.key.remoteJid,
          {
            forward: {
              key: {
                remoteJid: remoteJid,
                fromMe: true,
              },
              message: messaged,
            },
          },
          { quoted: isQuoted ? response : null }
        );
      } else {
        await socket
          .sendMessage(response.key.remoteJid, messages, {
            quoted: isQuoted ? response : null,
          })
          .catch((error) => {
            console.log(error);
          });
      }
      return true;
    } catch (error) {
      console.log(error);
    }
  };
async function sendWebhook({
  command: command,
  bufferImage: bufferImage,
  from: from,
  url: url,
  participant: participant,
}) {
  try {
    const postWeb = {
        message: command,
        bufferImage: bufferImage == undefined ? null : bufferImage,
        from: from,
        participant: participant,
      },
      headerWa = { "Content-Type": "application/json; charset=utf-8" },
      response = await axios.post(url, postWeb, headerWa).catch(() => {
        return false;
      });
    return response.data;
  } catch (error) {
    return console.log("error send webhook", error), false;
  }
}
module.exports = { IncomingMessage: IncomingMessage };
