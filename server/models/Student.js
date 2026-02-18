const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    admissionNumber: { type: String, required: true, trim: true },
    yearGroup: { type: String, required: true, trim: true },
    form: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

StudentSchema.index({ schoolId: 1, admissionNumber: 1 }, { unique: true });
StudentSchema.index({ schoolId: 1, lastName: 1 });
StudentSchema.index({ schoolId: 1, yearGroup: 1 });

module.exports = mongoose.model("Student", StudentSchema);
