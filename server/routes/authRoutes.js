const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const {
  login,
  forgotSchoolCode,
  ownerLogin,
  bootstrapOwner,
  me,
  changePassword,
} = require("../controllers/authController");

router.post("/login", login);
router.post("/forgot-school-code", forgotSchoolCode);

router.post("/owner/login", ownerLogin);
router.post("/owner/bootstrap", bootstrapOwner);

router.get("/me", requireAuth, me);
router.post("/change-password", requireAuth, changePassword);

module.exports = router;
