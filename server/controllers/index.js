"use strict";

const { formatReceipt } = require("../lib/helper"),
  wa = require("../whatsapp"),
  createInstance = async (response, socket) => {
    const { token: token } = response.body;
    if (token) {
      try {
        const evs = await wa.connectToWhatsApp(token, response.io),
          results = evs?.status,
          msgRsu = evs?.message;
        return socket.send({
          status: results ?? "processing",
          qrcode: evs?.qrcode,
          message: msgRsu ? msgRsu : "Processing",
        });
      } catch (error) {
        return (
          console.log(error),
          socket.send({
            status: false,
            error: error,
          })
        );
      }
    }
    socket.status(403).end("Token needed");
  },
  sendText = async (response, socket) => {
    const { token: token, number: number, text: texts } = response.body;
    if (token && number && texts) {
      const sendWa = await wa.sendText(token, number, texts);
      return handleResponSendMessage(sendWa, socket);
    }
    socket.send({
      status: false,
      message: "Check your parameter",
    });
  },
  sendMedia = async (response, socket) => {
    const {
      token: token,
      number: number,
      type: types,
      url: url,
      caption: caption,
      ptt: ptt,
      filename: filename,
    } = response.body;
    if (token && number && types && url) {
      const sendWaMe = await wa.sendMedia(
        token,
        number,
        types,
        url,
        caption ?? "",
        ptt,
        filename
      );
      return handleResponSendMessage(sendWaMe, socket);
    }
    socket.send({
      status: false,
      message: "Check your parameter",
    });
  },
  sendButtonMessage = async (response, socket) => {
    const {
      token: token,
      number: number,
      button: buttons,
      message: message,
      footer: footer,
      image: images,
    } = response.body;
    const jsonBut = JSON.parse(buttons);
    if (token && number && buttons && message) {
      const sendWaBut = await wa.sendButtonMessage(
        token,
        number,
        jsonBut,
        message,
        footer,
        images
      );
      return handleResponSendMessage(sendWaBut, socket);
    }
    socket.send({
      status: false,
      message: "Check your parameterr",
    });
  },
  sendTemplateMessage = async (response, socket) => {
    const {
      token: token,
      number: number,
      button: buttons,
      text: texts,
      footer: footer,
      image: images,
    } = response.body;
    if (token && number && buttons && texts && footer) {
      const sendTem = await wa.sendTemplateMessage(
        token,
        number,
        JSON.parse(buttons),
        texts,
        footer,
        images
      );
      return handleResponSendMessage(sendTem, socket);
    }
    socket.send({
      status: false,
      message: "Check your parameter",
    });
  },
  sendListMessage = async (response, socket) => {
    const {
      token: token,
      number: number,
      list: list,
      text: texts,
      footer: footer,
      title: title,
      buttonText: buttonText,
    } = response.body;
    if (token && number && list && texts && title && buttonText) {
      const sendWaLi = await wa.sendListMessage(
        token,
        number,
        JSON.parse(list),
        texts,
        footer ?? "",
        title,
        buttonText
      );
      return handleResponSendMessage(sendWaLi, socket);
    }
    socket.send({
      status: false,
      message: "Check your parameterr",
    });
  },
  sendPoll = async (response, socket) => {
    const {
      token: token,
      number: number,
      name: name,
      options: options,
      countable: countable,
    } = response.body;
    if (token && number && name && options && countable) {
      const sendWaPo = await wa.sendPollMessage(
        token,
        number,
        name,
        JSON.parse(options),
        countable
      );
      return handleResponSendMessage(sendWaPo, socket);
    }
    socket.send({
      status: false,
      message: "Check your parameterrss",
    });
  };
const fetchGroups = async (response, socket) => {
    const { token: token } = response.body;
    if (token) {
      const fetchGr = await wa.fetchGroups(token);
      return handleResponSendMessage(fetchGr, socket);
    }
    socket.send({
      status: false,
      message: "Check your parameter",
    });
  },
  deleteCredentials = async (response, socket) => {
    const { token: token } = response.body;
    if (token) {
      const delCred = await wa.deleteCredentials(token);
      return handleResponSendMessage(delCred, socket);
    }
    socket.send({
      status: false,
      message: "Check your parameter",
    });
  },
  handleResponSendMessage = (data, socket, nulls = null) => {
    if (data) {
      return socket.send({
        status: true,
        data: data,
      });
    }
    return socket.send({
      status: false,
      message: "Check your whatsapp connection",
    });
  },
  checkNumber = async (response, socket) => {
    const { token: token, number: number } = response.body;
    if (token && number) {
      const waIsEx = await wa.isExist(token, number);
      return (
        console.log(waIsEx),
        socket.send({
          status: true,
          active: waIsEx,
        })
      );
    }
    socket.send({
      status: false,
      message: "Check your parameter",
    });
  },
  logoutDevice = async (response, socket) => {
    const { token: token } = response.body;
    if (token) {
      const waDelCred = await wa.deleteCredentials(token);
      return socket.send(waDelCred);
    }
    return socket.send({
      status: false,
      message: "Check your parameter",
    });
  };
module.exports = {
  createInstance: createInstance,
  sendText: sendText,
  sendMedia: sendMedia,
  sendButtonMessage: sendButtonMessage,
  sendTemplateMessage: sendTemplateMessage,
  sendListMessage: sendListMessage,
  deleteCredentials: deleteCredentials,
  fetchGroups: fetchGroups,
  sendPoll: sendPoll,
  logoutDevice: logoutDevice,
  checkNumber: checkNumber,
};
