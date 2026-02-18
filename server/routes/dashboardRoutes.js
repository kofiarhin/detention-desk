const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const { getAdminDashboard } = require("../controllers/dashboardController");

router.use(requireAuth, requireTenant, requireRole("schoolAdmin"));

router.get("/admin", getAdminDashboard);

module.exports = router;
