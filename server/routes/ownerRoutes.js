const express = require("express");
const router = express.Router();

const { listSchools, resetDb } = require("../controllers/ownerController");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

router.get("/schools", requireAuth, requireRole("owner"), listSchools);
router.post("/dev/reset-db", requireAuth, requireRole("owner"), resetDb);

module.exports = router;
