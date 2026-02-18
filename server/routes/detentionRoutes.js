const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const { requireTeacherPermission } = require("../middleware/requireTeacherPermission");
const {
  listDetentions,
  getDetention,
  updateDetention,
  serveDetention,
  voidDetention,
  bulkServeDetentions,
  bulkVoidDetentions,
  bulkScheduleDetentions,
} = require("../controllers/detentionController");

router.use(requireAuth, requireTenant, requireRole("schoolAdmin", "teacher"));

router.get("/", listDetentions);

router.post("/bulk/serve", requireRole("schoolAdmin"), bulkServeDetentions);
router.post("/bulk/void", requireRole("schoolAdmin"), bulkVoidDetentions);
router.post("/bulk/schedule", requireRole("schoolAdmin"), bulkScheduleDetentions);

router.get("/:id", getDetention);
router.put("/:id", requireRole("schoolAdmin"), updateDetention);
router.post("/:id/serve", requireTeacherPermission("canCompleteDetentions"), serveDetention);
router.post("/:id/void", requireRole("schoolAdmin"), voidDetention);

module.exports = router;
