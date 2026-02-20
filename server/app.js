const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const signupRoutes = require("./routes/signupRoutes");
const authRoutes = require("./routes/authRoutes");
const policyRoutes = require("./routes/policyRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const studentRoutes = require("./routes/studentRoutes");
const incidentRoutes = require("./routes/incidentRoutes");
const detentionRoutes = require("./routes/detentionRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const offsetRoutes = require("./routes/offsetRoutes");
const noteRoutes = require("./routes/noteRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const studentProfileRoutes = require("./routes/studentProfileRoutes");
const adminRoutes = require("./routes/adminRoutes");
const parentRoutes = require("./routes/parentRoutes");

const { getConfig, isConfigValidated } = require("./config/env");
const { isDbReady } = require("./config/db");
const { requestIdMiddleware } = require("./middleware/requestId");
const { requestLoggerMiddleware } = require("./middleware/requestLogger");
const {
  authLimiter,
  writeLimiter,
  bulkLimiter,
  methodScopedLimiter,
} = require("./middleware/rateLimiters");
const { errorResponse } = require("./utils/response");

function buildCorsOptions(config) {
  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (config.corsOrigins.has(origin)) {
        return callback(null, true);
      }

      if (config.isProduction) {
        return callback(new Error("CORS origin blocked"));
      }

      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-bootstrap-secret",
      "x-reset-secret",
      "x-request-id",
    ],
    credentials: false,
    optionsSuccessStatus: 204,
  };
}

function buildApp() {
  const app = express();
  const config = getConfig();
  const corsOptions = buildCorsOptions(config);

  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  if (config.enableHelmet) {
    app.use(helmet());
  }

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (req, res) => {
    return res.status(200).json({ status: "ok" });
  });

  app.get("/ready", (req, res) => {
    const configReady = isConfigValidated() || config.isTest || !config.isProduction;

    if (!configReady || !isDbReady()) {
      return res.status(503).json({ status: "not_ready", code: "NOT_READY" });
    }

    return res.status(200).json({ status: "ok" });
  });

  app.use(["/signup/school", "/api/signup/school"], authLimiter);
  app.use(["/auth/login", "/api/auth/login", "/auth/change-password", "/api/auth/change-password"], authLimiter);

  app.use("/api/admin/parents", methodScopedLimiter(writeLimiter, ["POST"]));
  app.use(
    ["/api/admin/teachers", "/api/admin/students"],
    methodScopedLimiter(writeLimiter, ["POST", "PATCH"]),
  );
  app.use(["/api/incidents", "/api/rewards", "/api/notes"], methodScopedLimiter(writeLimiter, ["POST", "PUT", "PATCH", "DELETE"]));
  app.use("/api/detentions/bulk", methodScopedLimiter(bulkLimiter, ["POST", "PUT", "PATCH"]));
  app.use("/api/detentions", methodScopedLimiter(writeLimiter, ["POST", "PUT", "PATCH", "DELETE"]));

  app.use("/signup", signupRoutes);
  app.use("/api/signup", signupRoutes);
  app.use("/auth", authRoutes);
  app.use("/api/auth", authRoutes);

  // tenant-scoped routes (schoolId required; owner forbidden here)
  app.use("/policy", policyRoutes);
  app.use("/categories", categoryRoutes);

  // platform owner routes (role=owner; schoolId null)
  app.use("/owner", ownerRoutes);

  app.use("/api/admin", adminRoutes);
  app.use("/api/parent", parentRoutes);

  app.use("/api/students", studentProfileRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/incidents", incidentRoutes);
  app.use("/api/detentions", detentionRoutes);
  app.use("/api/rewards", rewardRoutes);
  app.use("/api/offsets", offsetRoutes);
  app.use("/api/notes", noteRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.use((req, res) => {
    return res.status(404).json(errorResponse("NOT_FOUND", "Route not found"));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "unhandled_error",
        requestId: req.requestId,
        path: req.originalUrl,
        method: req.method,
        error: err.message,
        stack: config.isProduction ? undefined : err.stack,
      }),
    );

    const status = err.statusCode || (err.message === "CORS origin blocked" ? 403 : 500);

    if (err.message === "CORS origin blocked") {
      return res.status(status).json(errorResponse("CORS_FORBIDDEN", "Origin not allowed"));
    }

    return res
      .status(status)
      .json(errorResponse("SERVER_ERROR", "Something went wrong"));
  });

  return app;
}

module.exports = { buildApp };
