const router = require("express").Router();
const { signupSchool } = require("../controllers/signupController");

router.post("/school", signupSchool);

module.exports = router;
