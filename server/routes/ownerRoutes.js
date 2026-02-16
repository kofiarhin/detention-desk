const express = require("express");
const router = express.Router();

const { listSchools, resetDb } = require("../controllers/ownerController");
const requireAuth = require("../middleware/requireAuth");

// ✅ your middleware exports { requireRole }, so destructure it
const { requireRole } = require("../middleware/requireRole");

// owner-only
router.get("/schools", requireAuth, requireRole(["owner"]), listSchools);

// owner-only dev utility
router.post("/dev/reset-db", requireAuth, requireRole(["owner"]), resetDb);

module.exports = router;
