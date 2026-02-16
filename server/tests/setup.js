const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongo;

beforeAll(async () => {
  process.env.NODE_ENV = "test";

  // ensure secrets exist in test env
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
  process.env.OWNER_BOOTSTRAP_SECRET =
    process.env.OWNER_BOOTSTRAP_SECRET || "test_bootstrap_secret";
  process.env.RESET_DB_SECRET =
    process.env.RESET_DB_SECRET || "test_reset_secret";

  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  await mongoose.connect(uri, {
    autoIndex: true,
  });
});

afterEach(async () => {
  // deterministic tests: wipe DB between tests to avoid duplicate schoolCode/email collisions
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
