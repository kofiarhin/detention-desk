function requestLoggerMiddleware(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const auth = req.auth || req.user || null;

    const payload = {
      level: "info",
      msg: "request",
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
    };

    if (auth) {
      payload.userId = auth.userId || auth.id || null;
      payload.role = auth.role || null;
      payload.schoolId = auth.schoolId || null;
    }

    console.log(JSON.stringify(payload));
  });

  return next();
}

module.exports = { requestLoggerMiddleware };
