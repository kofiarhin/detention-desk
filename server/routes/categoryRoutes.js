const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");

const {
  listCategories,
  createCategory,
  updateCategory,
  toggleCategory,
} = require("../controllers/categoryController");

router.get(
  "/",
  requireAuth,
  requireTenant,
  requireRole("schoolAdmin", "teacher"),
  listCategories,
);
router.post(
  "/",
  requireAuth,
  requireTenant,
  requireRole("schoolAdmin"),
  createCategory,
);
router.put(
  "/:id",
  requireAuth,
  requireTenant,
  requireRole("schoolAdmin"),
  updateCategory,
);
router.patch(
  "/:id/toggle",
  requireAuth,
  requireTenant,
  requireRole("schoolAdmin"),
  toggleCategory,
);

module.exports = router;
