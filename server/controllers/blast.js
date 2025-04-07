const { dbQuery } = require("../database"),
  { formatReceipt, prepareMediaMessage } = require("../lib/helper"),
  wa = require("../whatsapp"),
  fs = require("fs");
let inProgress = [];
const updateStatus = async (campaignUp, receiverUp, blastsUp) => {
    await dbQuery(
      "UPDATE blasts SET status = '" +
        blastsUp +
        "' WHERE receiver = '" +
        receiverUp +
        "' AND campaign_id = '" +
        campaignUp +
        "'"
    );
  },
  checkBlast = async (campaignCh, blastsCh) => {
    const resultCheck = await dbQuery(
      "SELECT status FROM blasts WHERE receiver = '" +
        blastsCh +
        "' AND campaign_id = '" +
        campaignCh +
        "'"
    );
    return resultCheck.length > 0 && resultCheck[0].status === "pending";
  };
const sendBlastMessage = async (response, socket) => {
  const dataRes = JSON.parse(response.body.data),
    msgData = dataRes.data,
    id = dataRes.campaign_id,
    timeRes = (timeBlast) =>
      new Promise((promiseTime) => setTimeout(promiseTime, timeBlast));
  if (inProgress[id]) {
    return (
      console.log(
        "still any progress in campaign id " + id + ", request canceled. "
      ),
      socket.send({ status: "in_progress" })
    );
  }
  inProgress[id] = true;
  console.log("progress campaign ID : " + id + " started");
  socket.send({ status: "in_progress" });
  const SendBlastPr = async () => {
    for (let blastSocket in msgData) {
      const delayData = dataRes.delay;
      await timeRes(delayData * 1000);
      if (
        dataRes.sender &&
        msgData[blastSocket].receiver &&
        msgData[blastSocket].message
      ) {
        const checkBla = await checkBlast(id, msgData[blastSocket].receiver);
        if (checkBla) {
          try {
            const isExBla = await wa.isExist(
              dataRes.sender,
              formatReceipt(msgData[blastSocket].receiver)
            );
            if (!isExBla) {
              await updateStatus(id, msgData[blastSocket].receiver, "failed");
              continue;
            }
          } catch (error) {
            console.error("Error in wa.isExist: ", error);
            await updateStatus(id, msgData[blastSocket].receiver, "failed");
            continue;
          }
          try {
            let SendDat;
            if (dataRes.type === "media") {
              const resultSend = JSON.parse(msgData[blastSocket].message);
              SendDat = await wa.sendMedia(
                dataRes.sender,
                msgData[blastSocket].receiver,
                resultSend.type,
                resultSend.url,
                resultSend.caption,
                0,
                resultSend.filename
              );
            } else {
              SendDat = await wa.sendMessage(
                dataRes.sender,
                msgData[blastSocket].receiver,
                msgData[blastSocket].message
              );
            }
            const checkSucc = SendDat ? "success" : "failed";
            await updateStatus(id, msgData[blastSocket].receiver, checkSucc);
          } catch (error) {
            console.error(error);
            error.message.includes("503")
              ? (console.log(
                  "Server is busy, waiting for 5 seconds before retrying..."
                ),
                await timeRes(5000),
                blastSocket--)
              : await updateStatus(id, msgData[blastSocket].receiver, "failed");
          }
        } else {
          console.log("no pending, not send!");
        }
      } else {
        console.log("wrong data, progress canceled!");
      }
    }
    delete inProgress[id];
  };
  SendBlastPr().catch((error) => {
    console.error("Error in send operation: " + error);
    delete inProgress[id];
  });
};
module.exports = { sendBlastMessage: sendBlastMessage };
