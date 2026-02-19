const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireSchoolAdmin } = require("../middleware/requireRole");
const { createParentAndLink, revokeParentLink } = require("../controllers/adminParentController");
const {
  createTeacher,
  listTeachers,
  deactivateTeacher,
  reactivateTeacher,
  reassignStudent,
} = require("../controllers/adminTeacherController");

router.use(requireAuth, requireTenant, requireSchoolAdmin);

router.post("/parents", createParentAndLink);
router.patch("/parent-links/:id/revoke", revokeParentLink);

router.post("/teachers", createTeacher);
router.get("/teachers", listTeachers);
router.patch("/teachers/:id/deactivate", deactivateTeacher);
router.patch("/teachers/:id/reactivate", reactivateTeacher);

router.patch("/students/:id/reassign", reassignStudent);

module.exports = router;
