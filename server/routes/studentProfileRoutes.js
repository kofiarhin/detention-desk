const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const { getStudentProfile, getStudentTimeline } = require("../controllers/studentProfileController");

router.use(requireAuth, requireTenant, requireRole("schoolAdmin", "teacher"));

router.get("/:id/profile", getStudentProfile);
router.get("/:id/timeline", getStudentTimeline);

module.exports = router;
