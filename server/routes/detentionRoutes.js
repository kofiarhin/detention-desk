const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const {
  listDetentions,
  getDetention,
  updateDetention,
  serveDetention,
  voidDetention,
} = require("../controllers/detentionController");

router.use(requireAuth, requireTenant, requireRole("schoolAdmin", "teacher"));

router.get("/", listDetentions);
router.get("/:id", getDetention);
router.put("/:id", requireRole("schoolAdmin"), updateDetention);
router.post("/:id/serve", serveDetention);
router.post("/:id/void", requireRole("schoolAdmin"), voidDetention);

module.exports = router;
