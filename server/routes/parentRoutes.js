const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const {
  listParentStudents,
  getParentStudent,
  getParentStudentTimeline,
} = require("../controllers/parentController");

router.use(requireAuth, requireTenant, requireRole("parent"));

router.get("/students", listParentStudents);
router.get("/students/:id", getParentStudent);
router.get("/students/:id/timeline", getParentStudentTimeline);

module.exports = router;
