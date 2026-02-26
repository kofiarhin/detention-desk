const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireSchoolAdmin } = require("../middleware/requireRole");
const {
  createParentAndLink,
  listParentLinks,
  revokeParentLink,
  getParentLinkDetails,
  updateParentProfile,
  reassignParentLink,
  updateParentLinkStatus,
} = require("../controllers/adminParentController");
const {
  createTeacher,
  listTeachers,
  getTeacherDetails,
  updateTeacher,
  updateTeacherStatus,
  deactivateTeacher,
  reactivateTeacher,
  reassignTeacherGroup,
  listGroups,
  assignGroupOwner,
} = require("../controllers/adminTeacherController");

router.use(requireAuth, requireTenant, requireSchoolAdmin);

router.post("/parents", createParentAndLink);
router.get("/parent-links", listParentLinks);
router.patch("/parent-links/:id/revoke", revokeParentLink);
router.get("/parents/:parentLinkId", getParentLinkDetails);
router.put("/parents/:parentLinkId", updateParentProfile);
router.put("/parents/:parentLinkId/reassign", reassignParentLink);
router.patch("/parents/:parentLinkId/status", updateParentLinkStatus);

router.post("/teachers", createTeacher);
router.get("/teachers", listTeachers);
router.get("/teachers/:teacherId", getTeacherDetails);
router.put("/teachers/:teacherId", updateTeacher);
router.put("/teachers/:teacherId/group", reassignTeacherGroup);
router.patch("/teachers/:teacherId/status", updateTeacherStatus);
router.patch("/teachers/:id/deactivate", deactivateTeacher);
router.patch("/teachers/:id/reactivate", reactivateTeacher);
router.patch("/teachers/:teacherId/reassign-group", reassignTeacherGroup);

router.get("/groups", listGroups);
router.patch("/groups/:id/assign-owner", assignGroupOwner);

module.exports = router;
