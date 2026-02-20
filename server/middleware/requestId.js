const { randomUUID } = require("crypto");

function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers["x-request-id"];
  const requestId =
    typeof incomingId === "string" && incomingId.trim()
      ? incomingId.trim()
      : randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  return next();
}

module.exports = { requestIdMiddleware };
