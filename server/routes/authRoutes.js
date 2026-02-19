const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const {
  login,
  ownerLogin,
  bootstrapOwner,
  me,
  changePassword,
} = require("../controllers/authController");

router.post("/login", login);

router.post("/owner/login", ownerLogin);
router.post("/owner/bootstrap", bootstrapOwner);

router.get("/me", requireAuth, me);
router.post("/change-password", requireAuth, changePassword);

module.exports = router;
