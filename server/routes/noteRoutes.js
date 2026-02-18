const router = require("express").Router();

const { requireAuth } = require("../middleware/requireAuth");
const { requireTenant } = require("../middleware/requireTenant");
const { requireRole } = require("../middleware/requireRole");
const { createNote, listNotes, deleteNote } = require("../controllers/noteController");

router.use(requireAuth, requireTenant, requireRole("schoolAdmin", "teacher"));

router.post("/", createNote);
router.get("/", listNotes);
router.delete("/:id", deleteNote);

module.exports = router;
