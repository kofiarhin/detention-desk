const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");

const { getPolicy, updatePolicy } = require("../controllers/policyController");

router.get(
  "/",
  requireAuth,
  requireTenant,
  requireRole("schoolAdmin", "teacher"),
  getPolicy,
);
router.put(
  "/",
  requireAuth,
  requireTenant,
  requireRole("schoolAdmin"),
  updatePolicy,
);

module.exports = router;
