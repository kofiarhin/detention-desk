const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const {
  login,
  ownerLogin,
  bootstrapOwner,
  me,
} = require("../controllers/authController");

router.post("/login", login);

router.post("/owner/login", ownerLogin);
router.post("/owner/bootstrap", bootstrapOwner);

router.get("/me", requireAuth, me);

module.exports = router;
