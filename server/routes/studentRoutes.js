const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const {
  createStudent,
  listStudents,
  getStudent,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");

router.use(requireAuth, requireTenant, requireRole("schoolAdmin", "teacher"));

router.post("/", createStudent);
router.get("/", listStudents);
router.get("/:id", getStudent);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);

module.exports = router;
