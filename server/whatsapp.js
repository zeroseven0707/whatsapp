const { Boom } = require("@hapi/boom");
const {
  default: makeWASocket,
  Browsers,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const QRCode = require("qrcode"),
  fs = require("fs");
let sock = [],
  qrcode = [],
  pairingCode = [],
  intervalStore = [];
const { setStatus } = require("./database/index"),
  { IncomingMessage } = require("./controllers/incomingMessage"),
  {
    formatReceipt,
    getSavedPhoneNumber,
    prepareMediaMessage,
  } = require("./lib/helper"),
  MAIN_LOGGER = require("./lib/pino"),
  NodeCache = require("node-cache"),
  logger = MAIN_LOGGER.child({}),
  msgRetryCounterCache = new NodeCache(),
  connectToWhatsApp = async (token, ev = null, auth = false) => {
    if (typeof qrcode[token] !== "undefined" && !auth) {
      return (
        ev?.emit("qrcode", {
          token: token,
          data: qrcode[token],
          message: "please scan with your Whatsapp Accountt",
        }),
        {
          status: false,
          sock: sock[token],
          qrcode: qrcode[token],
          message: "please scan",
        }
      );
    }
    if (typeof pairingCode[token] !== "undefined" && auth) {
      return (
        ev?.emit("code", {
          token: token,
          data: pairingCode[token],
          message:
            "Go to whatsapp -> link device -> link with phone number, and pairing with this code.",
        }),
        {
          status: false,
          code: pairingCode[token],
          message: "pairing with that code",
        }
      );
    }
    try {
      let phoneNum = sock[token].user.id.split(":");
      phoneNum = phoneNum[0] + "@s.whatsapp.net";
      const ppUrl = await getPpUrl(token, phoneNum);
      return (
        ev?.emit("connection-open", {
          token: token,
          user: sock[token].user,
          ppUrl: ppUrl,
        }),
        delete qrcode[token],
        delete pairingCode[token],
        {
          status: true,
          message: "Already connected",
        }
      );
    } catch (error) {
      ev?.emit("message", {
        token: token,
        message: "Connecting.. (1)..",
      });
    }
    const { version: version, isLatest: isLatest } =
      await fetchLatestBaileysVersion();
    console.log(
      "You re using whatsapp gateway M Pedia v6.1.0 - Contact admin if any trouble : 6292298859671"
    );
    console.log("using WA v" + version.join(".") + ", isLatest: " + isLatest);
    const { state: state, saveCreds: saveCreds } = await useMultiFileAuthState(
      "./credentials/" + token
    );
    sock[token] = makeWASocket({
      version: version,
      browser: Browsers.macOS("Chrome", "Mpedia"),
      logger: logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      msgRetryCounterCache: msgRetryCounterCache,
      generateHighQualityLinkPreview: true,
    });
    if (auth && "me" in state.creds === false) {
      const phoneNumber = await getSavedPhoneNumber(token);
      try {
        const code = await sock[token].requestPairingCode(phoneNumber);
        pairingCode[token] = code;
      } catch (error) {
        ev?.emit("message", {
          token: token,
          message: "Time out, please refresh page",
        });
      }
      ev?.emit("code", {
        token: token,
        data: pairingCode[token],
        message:
          "Go to whatsapp -> link device -> link with phone number, and pairing with this code.",
      });
    }
    return (
      sock[token].ev.process(async (events) => {
        if (events["connection.update"]) {
          const update = events["connection.update"],
            {
              connection: connection,
              lastDisconnect: lastDisconnect,
              qr: qr,
            } = update;
          if (connection === "close") {
            const proto = lastDisconnect.error?.output?.payload?.message,
              msgs = lastDisconnect.error?.output?.payload?.error;
            if (
              (lastDisconnect?.error instanceof Boom)?.output?.statusCode !==
              DisconnectReason.loggedOut
            ) {
              delete qrcode[token];
              ev?.emit("message", {
                token: token,
                message: "Connecting..",
              });
              if (proto == "QR refs attempts ended") {
                sock[token].ws.close();
                delete qrcode[token];
                delete pairingCode[token];
                delete sock[token];
                ev?.emit("message", {
                  token: token,
                  message: "Request QR ended. reload web to scan again",
                });
                return;
              }
              (msgs === "Unauthorized" || msgs === "Method Not Allowed") &&
                (setStatus(token, "Disconnect"),
                clearConnection(token),
                connectToWhatsApp(token, ev));
              proto === "Stream Errored (restart required)" &&
                connectToWhatsApp(token, ev);
              proto === "Connection was lost" && delete sock[token];
            } else {
              setStatus(token, "Disconnect");
              console.log("Connection closed. You are logged out.");
              ev?.emit("message", {
                token: token,
                message: "Connection closed. You are logged out.",
              });
              clearConnection(token);
              connectToWhatsApp(token, ev);
            }
          }
          qr &&
            (console.log("new qr", token),
            QRCode.toDataURL(qr, function (resMsg, qrCode) {
              if (resMsg) {
                console.log(resMsg);
              }
              qrcode[token] = qrCode;
              connectToWhatsApp(token, ev, auth);
            }));
          if (connection === "open") {
            console.log("OPEN OPEN OPEN");
            setStatus(token, "Connected");
            delete qrcode[token];
            delete pairingCode[token];
            let PhoneNums = sock[token].user.id.split(":");
            PhoneNums = PhoneNums[0] + "@s.whatsapp.net";
            const ppUrl = await getPpUrl(token, PhoneNums);
            ev?.emit("connection-open", {
              token: token,
              user: sock[token].user,
              ppUrl: ppUrl,
            });
            delete qrcode[token];
            delete pairingCode[token];
          }
        }
        if (events["creds.update"]) {
          const updateCreds = events["creds.update"];
          saveCreds(updateCreds);
        }
        if (events["messages.upsert"]) {
          const msgUpsert = events["messages.upsert"];
          IncomingMessage(msgUpsert, sock[token]);
        }
      }),
      {
        sock: sock[token],
        qrcode: qrcode[token],
      }
    );
  };
async function connectWaBeforeSend(connTo) {
  let undConn = undefined,
    connWa;
  connWa = await connectToWhatsApp(connTo);
  await connWa.sock.ev.on("connection.update", (qrtoken) => {
    const { connection: connection, qr: qr } = qrtoken;
    connection === "open" && (undConn = true);
    qr && (undConn = false);
  });
  let i = 0;
  while (typeof undConn === "undefined") {
    i++;
    if (i > 4) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return undConn;
}
const sendText = async (token, format, tests) => {
    try {
      const conn = await sock[token].sendMessage(formatReceipt(format), {
        text: tests,
      });
      return conn;
    } catch (error) {
      return false;
    }
  },
  sendMessage = async (token, format, jsonString) => {
    try {
      const conn = await sock[token].sendMessage(
        formatReceipt(format),
        JSON.parse(jsonString)
      );
      return conn;
    } catch (error) {
      return false;
    }
  };
async function sendMedia(token, format, type, url, caption, options, fileName) {
  const id = formatReceipt(format);
  let Jid = sock[token].user.id.replace(/:\d+/, "");
  if (type == "audio") {
    return await sock[token].sendMessage(id, {
      audio: { url: url },
      ptt: true,
      mimetype: "audio/mpeg",
    });
  }
  const resPrep = await prepareMediaMessage(sock[token], {
      caption: caption ? caption : "",
      fileName: fileName,
      media: url,
      mediatype: type !== "video" && type !== "image" ? "document" : type,
    }),
    message = { ...resPrep.message };
  return await sock[token].sendMessage(id, {
    forward: {
      key: {
        remoteJid: Jid,
        fromMe: true,
      },
      message: message,
    },
  });
}
async function sendButtonMessage(token, format, list, caption, footer, url) {
  let type = "url";
  try {
    const buttons = list.map((string, buttonId) => {
      return {
        buttonId: buttonId,
        buttonText: { displayText: string.displayText },
        type: 1,
      };
    });
    if (url) {
      var isimg = {
        image:
          type == "url"
            ? { url: url }
            : fs.readFileSync("src/public/temp/" + url),
        caption: caption,
        footer: footer,
        buttons: buttons,
        headerType: 4,
        viewOnce: true,
      };
    } else {
      var isimg = {
        text: caption,
        footer: footer,
        buttons: buttons,
        headerType: 1,
        viewOnce: true,
      };
    }
    const sendMs = await sock[token].sendMessage(formatReceipt(format), isimg);
    return sendMs;
  } catch (error) {
    return console.log(error), false;
  }
}
async function sendTemplateMessage(
  token,
  format,
  templateButtons,
  caption,
  footer,
  url
) {
  try {
    if (url) {
      var types = {
        caption: caption,
        footer: footer,
        viewOnce: true,
        templateButtons: templateButtons,
        image: { url: url },
        viewOnce: true,
      };
    } else {
      var types = {
        text: caption,
        footer: footer,
        viewOnce: true,
        templateButtons: templateButtons,
      };
    }
    const resSendMsg = await sock[token].sendMessage(
      formatReceipt(format),
      types
    );
    return resSendMsg;
  } catch (error) {
    return console.log(error), false;
  }
}
async function sendListMessage(
  token,
  format,
  sections,
  texts,
  footer,
  title,
  buttonText
) {
  try {
    const Lists = {
        text: texts,
        footer: footer,
        title: title,
        buttonText: buttonText,
        sections: [sections],
      },
      resSendMsg = await sock[token].sendMessage(formatReceipt(format), Lists, {
        ephemeralExpiration: 604800,
      });
    return resSendMsg;
  } catch (error) {
    return console.log(error), false;
  }
}
async function sendPollMessage(token, format, name, values, selectableCount) {
  try {
    const ResSendMsg = await sock[token].sendMessage(formatReceipt(format), {
      poll: {
        name: name,
        values: values,
        selectableCount: selectableCount,
      },
    });
    return ResSendMsg;
  } catch (error) {
    return console.log(error), false;
  }
}
async function fetchGroups(token) {
  try {
    if (typeof sock[token] === "undefined") {
      const ConnBe = await connectWaBeforeSend(token);
      if (!ConnBe) {
        return false;
      }
    }
    let GetAll = await sock[token].groupFetchAllParticipating(),
      ResGet = Object.entries(GetAll)
        .slice(0)
        .map((MapGroup) => MapGroup[1]);
    return ResGet;
  } catch (error) {
    return false;
  }
}
async function isExist(token, PhoneNum) {
  try {
    if (typeof sock[token] === "undefined") {
      const ConnBe = await connectWaBeforeSend(token);
      if (!ConnBe) {
        return false;
      }
    }
    if (PhoneNum.includes("@g.us")) {
      return true;
    } else {
      const [isNum] = await sock[token].onWhatsApp("+" + PhoneNum);
      return PhoneNum.length > 11 ? isNum : true;
    }
  } catch (error) {
    return false;
  }
}
async function getPpUrl(token, string, type) {
  let imgPp;
  try {
    return (imgPp = await sock[token].profilePictureUrl(string)), imgPp;
  } catch (error) {
    return "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/1200px-WhatsApp.svg.png";
  }
}
async function deleteCredentials(token, evs = null) {
  evs !== null &&
    evs.emit("message", {
      token: token,
      message: "Logout Progres..",
    });
  try {
    if (typeof sock[token] === "undefined") {
      const ConnWaBe = await connectWaBeforeSend(token);
      ConnWaBe && (sock[token].logout(), delete sock[token]);
    } else {
      sock[token].logout();
      delete sock[token];
    }
    return (
      delete qrcode[token],
      clearInterval(intervalStore[token]),
      setStatus(token, "Disconnect"),
      evs != null &&
        (evs.emit("Unauthorized", token),
        evs.emit("message", {
          token: token,
          message: "Connection closed. You are logged out.",
        })),
      fs.existsSync("./credentials/" + token) &&
        fs.rmSync(
          "./credentials/" + token,
          {
            recursive: true,
            force: true,
          },
          (debug) => {
            if (debug) {
              console.log(debug);
            }
          }
        ),
      {
        status: true,
        message: "Deleting session and credential",
      }
    );
  } catch (error) {
    return (
      console.log(error),
      {
        status: true,
        message: "Nothing deleted",
      }
    );
  }
}
function clearConnection(token) {
  clearInterval(intervalStore[token]);
  delete sock[token];
  delete qrcode[token];
  setStatus(token, "Disconnect");
  fs.existsSync("./credentials/" + token) &&
    (fs.rmSync(
      "./credentials/" + token,
      {
        recursive: true,
        force: true,
      },
      (debug) => {
        if (debug) {
          console.log(debug);
        }
      }
    ),
    console.log("credentials/" + token + " is deleted"));
}
async function initialize(filetoken, result) {
  const { token: token } = filetoken.body;
  if (token) {
    const readFileSync = require("fs"),
      path = "./credentials/" + token;
    if (readFileSync.existsSync(path)) {
      sock[token] = undefined;
      const resultBefore = await connectWaBeforeSend(token);
      return resultBefore
        ? result.status(200).json({
            status: true,
            message: token + " connection restored",
          })
        : result.status(200).json({
            status: false,
            message: token + " connection failed",
          });
    }
    return result.send({
      status: false,
      message: token + " Connection failed,please scan first",
    });
  }
  return result.send({
    status: false,
    message: "Wrong Parameterss",
  });
}
module.exports = {
  connectToWhatsApp: connectToWhatsApp,
  sendText: sendText,
  sendMedia: sendMedia,
  sendButtonMessage: sendButtonMessage,
  sendTemplateMessage: sendTemplateMessage,
  sendListMessage: sendListMessage,
  sendPollMessage: sendPollMessage,
  isExist: isExist,
  getPpUrl: getPpUrl,
  fetchGroups: fetchGroups,
  deleteCredentials: deleteCredentials,
  sendMessage: sendMessage,
  initialize: initialize,
  connectWaBeforeSend: connectWaBeforeSend,
  sock: sock,
};
