const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const { requireTeacherPermission } = require("../middleware/requireTeacherPermission");
const { createReward, listRewards, getReward } = require("../controllers/rewardController");

router.use(requireAuth, requireTenant, requireRole("schoolAdmin", "teacher"));

router.post("/", requireTeacherPermission("canAwardRewards"), createReward);
router.get("/", listRewards);
router.get("/:id", getReward);

module.exports = router;
