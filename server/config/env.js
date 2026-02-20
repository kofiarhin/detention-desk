const DEFAULT_DEV_ORIGINS = [
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

let cachedConfig = null;
let configValidated = false;

function parseOrigins(value) {
  if (!value || typeof value !== "string") return new Set();

  return new Set(
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function buildConfig() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const isTest = nodeEnv === "test";

  const envOrigins = parseOrigins(process.env.CORS_ORIGINS);
  const corsOrigins = new Set(envOrigins);

  if (!isProduction && corsOrigins.size === 0) {
    DEFAULT_DEV_ORIGINS.forEach((origin) => corsOrigins.add(origin));
  }

  const parsedPort = Number(process.env.PORT);

  return {
    nodeEnv,
    isProduction,
    isTest,
    port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 5000,
    mongoUri: (process.env.MONGO_URI || "").trim(),
    jwtSecret: (process.env.JWT_SECRET || "").trim(),
    corsOrigins,
    frontendUrl: (process.env.APP_URL || process.env.FRONTEND_URL || "").trim(),
    emailFrom: (process.env.EMAIL_FROM || "").trim(),
    emailEnabled: String(process.env.EMAIL_ENABLED || "").toLowerCase() === "true",
    enableHelmet:
      String(process.env.ENABLE_HELMET || "").toLowerCase() === "true",
  };
}

function getConfig() {
  if (!cachedConfig) cachedConfig = buildConfig();
  return cachedConfig;
}

function hasMailerCredentials() {
  const resend = (process.env.RESEND_API_KEY || "").trim();
  const sendgrid = (process.env.SENDGRID_API_KEY || "").trim();
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").trim();

  return Boolean(resend || sendgrid || (smtpUser && smtpPass));
}

function validateStartupConfig() {
  const config = getConfig();
  const errors = [];

  if (!config.mongoUri) errors.push("MONGO_URI is required");
  if (!config.jwtSecret) errors.push("JWT_SECRET is required");

  if (config.isProduction) {
    if (!process.env.CORS_ORIGINS) {
      errors.push("CORS_ORIGINS is required in production");
    }

    if (config.corsOrigins.has("*")) {
      errors.push("CORS_ORIGINS must not include wildcard '*' in production");
    }

    if (!config.frontendUrl) {
      errors.push("APP_URL or FRONTEND_URL is required in production");
    }

    if (config.emailEnabled) {
      if (!config.emailFrom) {
        errors.push("EMAIL_FROM is required when email is enabled");
      }

      if (!hasMailerCredentials()) {
        errors.push(
          "Mailer credentials are required when email is enabled in production",
        );
      }
    }
  }

  if (errors.length) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Invalid startup configuration",
        errors,
      }),
    );
    process.exit(1);
  }

  configValidated = true;
  return config;
}

function isConfigValidated() {
  return configValidated;
}

module.exports = {
  getConfig,
  parseOrigins,
  validateStartupConfig,
  isConfigValidated,
};
