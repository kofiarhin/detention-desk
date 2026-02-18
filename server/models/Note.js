const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["student", "incident", "detention", "reward"],
      required: true,
      index: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    text: { type: String, required: true, trim: true },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

NoteSchema.index({ schoolId: 1, entityType: 1, entityId: 1 });

module.exports = mongoose.model("Note", NoteSchema);
