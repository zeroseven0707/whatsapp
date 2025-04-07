"use strict";

const fs = require("fs"),
  chats = (response, socket) => {
    const { token: token, type: types, jid: jid } = response.body;
    if (token && types) {
      try {
        const resFile = fs.readFileSync(
          "credentials/" + token + "/multistore.js",
          { encoding: "utf8" }
        );
        let store = JSON.parse(resFile);
        if (types === "chats") {
          store = store.chats;
        } else {
          if (types === "contacts") {
            store = store.contacts;
          } else {
            if (types === "messages") {
              jid ? (store = store.messages[jid]) : (store = store.messages);
            } else {
              return socket.send({
                status: false,
                message: "Unknown type",
              });
            }
          }
        }
        if (typeof store === "undefined") {
          return socket.send({
            status: false,
            message: "Data Not Found",
          });
        }
        return socket.send(store.length > 0 ? store.reverse() : store);
      } catch (error) {
        return (
          process.env.NODE_ENV !== "production" ? console.log(error) : null,
          socket.send({
            status: false,
            error: error,
          })
        );
      }
    }
    socket.send({
      status: false,
      error: "wrong parameters",
    });
  };
module.exports = { chats: chats };
