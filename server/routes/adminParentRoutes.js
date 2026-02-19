const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const {
  createParentAndLink,
  revokeParentLink,
} = require("../controllers/adminParentController");

router.use(requireAuth, requireTenant, requireRole("schoolAdmin"));

router.post("/parents", createParentAndLink);
router.patch("/parent-links/:id/revoke", revokeParentLink);

module.exports = router;
