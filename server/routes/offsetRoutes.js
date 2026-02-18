const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const { listOffsets } = require("../controllers/rewardController");

router.get("/", requireAuth, requireTenant, requireRole("schoolAdmin", "teacher"), listOffsets);

module.exports = router;
