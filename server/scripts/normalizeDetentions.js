require("dotenv").config();

const mongoose = require("mongoose");

const { connectDB } = require("../config/db");
const Detention = require("../models/Detention");

async function normalizeDetentions() {
  await connectDB();

  const now = new Date();

  const [scheduledFix, pendingFix, servedFix] = await Promise.all([
    Detention.updateMany(
      {
        scheduledFor: { $ne: null },
        servedAt: null,
        status: { $nin: ["scheduled", "voided"] },
      },
      {
        $set: { status: "scheduled" },
      },
    ),
    Detention.updateMany(
      {
        $or: [{ scheduledFor: null }, { scheduledFor: { $exists: false } }],
        servedAt: null,
        status: "scheduled",
      },
      {
        $set: { status: "pending" },
      },
    ),
    Detention.updateMany(
      { servedAt: { $ne: null } },
      {
        $set: {
          status: "served",
          minutesRemaining: 0,
          voidedAt: null,
          voidedBy: null,
        },
      },
    ),
  ]);

  const summary = {
    ranAt: now.toISOString(),
    scheduledAligned: Number(scheduledFix.modifiedCount || 0),
    pendingAligned: Number(pendingFix.modifiedCount || 0),
    servedAligned: Number(servedFix.modifiedCount || 0),
  };

  console.log(JSON.stringify({ level: "info", event: "normalize_detentions_complete", summary }));
}

normalizeDetentions()
  .catch((error) => {
    console.error(JSON.stringify({ level: "error", event: "normalize_detentions_failed", message: error.message }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
