const mongoose = require("mongoose");

async function connectDB(uriOverride) {
  const uri = uriOverride || process.env.MONGO_URI;
  if (!uri) throw new Error("Missing MONGO_URI");

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { autoIndex: true });

  console.log(JSON.stringify({ level: "info", msg: "db_connected" }));
}

function isDbReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDbReady };
