const rateLimit = require("express-rate-limit");

function createLimiter({ windowMs, max }) {
  const isTest = process.env.NODE_ENV === "test";

  return rateLimit({
    windowMs,
    max: isTest ? Number.MAX_SAFE_INTEGER : max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
    handler: (req, res) => {
      return res.status(429).json({
        message: "Too many requests",
        code: "RATE_LIMITED",
        details: {},
      });
    },
  });
}

function methodScopedLimiter(limiter, methods) {
  const allowed = new Set(methods.map((method) => method.toUpperCase()));

  return (req, res, next) => {
    if (!allowed.has(req.method.toUpperCase())) return next();
    return limiter(req, res, next);
  };
}

const authLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const writeLimiter = createLimiter({ windowMs: 5 * 60 * 1000, max: 60 });
const bulkLimiter = createLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

module.exports = {
  authLimiter,
  writeLimiter,
  bulkLimiter,
  methodScopedLimiter,
};
