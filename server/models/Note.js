const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    assignedTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    visibleToParent: { type: Boolean, default: false, index: true },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);


NoteSchema.pre("validate", function (next) {
  if (!this.assignedTeacherId && this.authorId) {
    this.assignedTeacherId = this.authorId;
  }
  if (!this.studentId && this.entityId && this.entityType === "student") {
    this.studentId = this.entityId;
  }
  next();
});

NoteSchema.index({ schoolId: 1, entityType: 1, entityId: 1 });

module.exports = mongoose.model("Note", NoteSchema);
