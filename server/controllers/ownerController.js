const mongoose = require("mongoose");
const School = require("../models/School");
const { successResponse, errorResponse } = require("../utils/response");

exports.listSchools = async (req, res) => {
  try {
    const items = await School.find({}).sort({ createdAt: -1 }).lean();
    return res.json(successResponse(items));
  } catch (err) {
    console.error("[listSchools] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not load schools"));
  }
};

// DEV ONLY: drops all collections in the current connected database.
// Protected by:
// 1) requireAuth + requireRole(["owner"]) at route level
// 2) x-reset-secret header === RESET_DB_SECRET in .env
exports.resetDb = async (req, res) => {
  try {
    const expected = process.env.RESET_DB_SECRET;
    if (!expected) {
      return res
        .status(500)
        .json(errorResponse("SERVER_ERROR", "RESET_DB_SECRET not set"));
    }

    const provided = String(req.headers["x-reset-secret"] || "").trim();
    if (!provided || provided !== expected) {
      return res
        .status(401)
        .json(errorResponse("UNAUTHORIZED", "Invalid secret"));
    }

    const db = mongoose.connection?.db;
    if (!db) {
      return res
        .status(500)
        .json(errorResponse("SERVER_ERROR", "DB not connected"));
    }

    const collections = await db.collections();

    for (const c of collections) {
      // drop each collection (safe even if empty)
      await c.drop().catch((e) => {
        // ignore "ns not found" / already dropped
        if (!String(e?.message || "").includes("ns not found")) throw e;
      });
    }

    return res.json(
      successResponse({
        ok: true,
        droppedCollections: collections.map((c) => c.collectionName),
      }),
    );
  } catch (err) {
    console.error("[resetDb] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not reset database"));
  }
};
