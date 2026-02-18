const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const { requireTeacherPermission } = require("../middleware/requireTeacherPermission");
const {
  createIncident,
  listIncidents,
  getIncident,
  updateIncident,
  deleteIncident,
} = require("../controllers/incidentController");

router.use(requireAuth, requireTenant, requireRole("schoolAdmin", "teacher"));

router.post("/", requireTeacherPermission("canCreateIncidents"), createIncident);
router.get("/", listIncidents);
router.get("/:id", getIncident);
router.put("/:id", updateIncident);
router.delete("/:id", deleteIncident);

module.exports = router;
