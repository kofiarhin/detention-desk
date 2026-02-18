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

const { errorResponse } = require("./utils/response");

function buildApp() {
  const app = express();

  const corsOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(helmet());

  app.use(
    cors({
      origin: corsOrigins.length ? corsOrigins : "*",
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-bootstrap-secret",
        "x-reset-secret",
      ],
    }),
  );

  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (req, res) => {
    return res.json({ success: true, data: { ok: true } });
  });

  app.use("/signup", signupRoutes);
  app.use("/auth", authRoutes);

  // tenant-scoped routes (schoolId required; owner forbidden here)
  app.use("/policy", policyRoutes);
  app.use("/categories", categoryRoutes);

  // platform owner routes (role=owner; schoolId null)
  app.use("/owner", ownerRoutes);

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
    console.error("[server] unhandled error:", err);
    const status = err.statusCode || 500;
    return res
      .status(status)
      .json(errorResponse("SERVER_ERROR", "Something went wrong"));
  });

  return app;
}

module.exports = { buildApp };
