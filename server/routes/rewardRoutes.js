const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const { createReward, listRewards, getReward } = require("../controllers/rewardController");

router.use(requireAuth, requireTenant, requireRole("schoolAdmin", "teacher"));

router.post("/", createReward);
router.get("/", listRewards);
router.get("/:id", getReward);

module.exports = router;
