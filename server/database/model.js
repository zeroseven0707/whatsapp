const { dbQuery } = require("./index");
const cache = require("./../lib/cache"),
  myCache = cache.myCache,
  isExistsEqualCommand = async (autoRep, bodyCom) => {
    if (myCache.has(autoRep + bodyCom)) {
      return myCache.get(autoRep + bodyCom);
    }
    let resAuto = await dbQuery(
      "SELECT * FROM devices WHERE body = '" + bodyCom + "' LIMIT 1"
    );
    if (resAuto.length === 0) {
      return [];
    }
    let deviceId = resAuto[0].id;
    let resCach = await dbQuery(
      'SELECT * FROM autoreplies WHERE keyword = "' +
        autoRep +
        "\" AND type_keyword = 'Equal' AND device_id = " +
        deviceId +
        " AND status = 'Active' LIMIT 1"
    );
    if (resCach.length === 0) {
      return [];
    }
    return myCache.set(autoRep + bodyCom, resCach), resCach;
  },
  isExistsContainCommand = async (autoDb, autoCont) => {
    if (myCache.has("contain" + autoDb + autoCont)) {
      return myCache.get("contain" + autoDb + autoCont);
    }
    let bodyAuto = await dbQuery(
      "SELECT * FROM devices WHERE body = '" + autoCont + "' LIMIT 1"
    );
    if (bodyAuto.length === 0) {
      return [];
    }
    let deviceIdAgine = bodyAuto[0].id;
    let resBod = await dbQuery(
      'SELECT * FROM autoreplies WHERE LOCATE(keyword, "' +
        autoDb +
        "\") > 0 AND type_keyword = 'Contain' AND device_id = " +
        deviceIdAgine +
        " AND status = 'Active' LIMIT 1"
    );
    if (resBod.length === 0) {
      return [];
    }
    return myCache.set("contain" + autoDb + autoCont, resBod), resBod;
  },
  getUrlWebhook = async (bodyAg) => {
    if (myCache.has("webhook" + bodyAg)) {
      return myCache.get("webhook" + bodyAg);
    }
    let respWeb = null,
      resDbBo = await dbQuery(
        "SELECT webhook FROM devices WHERE body = '" + bodyAg + "' LIMIT 1"
      );
    return (
      resDbBo.length > 0 && (respWeb = resDbBo[0].webhook),
      myCache.set("webhook" + bodyAg, respWeb),
      respWeb
    );
  };
module.exports = {
  isExistsEqualCommand: isExistsEqualCommand,
  isExistsContainCommand: isExistsContainCommand,
  getUrlWebhook: getUrlWebhook,
};
