const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const { connectDB } = require("./config/db");
const { buildApp } = require("./app");

async function start() {
  await connectDB();

  const app = buildApp();
  const port = process.env.PORT || 5000;

  app.listen(port, () => {
    console.log(`[server] listening on :${port}`);
  });
}

start().catch((err) => {
  console.error("[server] fatal:", err);
  process.exit(1);
});
