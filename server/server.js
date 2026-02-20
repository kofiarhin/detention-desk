const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const { validateStartupConfig } = require("./config/env");
const { connectDB } = require("./config/db");
const { buildApp } = require("./app");

async function start() {
  const config = validateStartupConfig();

  await connectDB(config.mongoUri);

  const app = buildApp();

  app.listen(config.port, () => {
    console.log(
      JSON.stringify({
        level: "info",
        msg: "server_listening",
        port: config.port,
        env: config.nodeEnv,
      }),
    );
  });
}

start().catch((err) => {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "startup_failure",
      error: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    }),
  );
  process.exit(1);
});
