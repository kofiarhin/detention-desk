const mongoose = require("mongoose");
const { normalizeSchoolCode } = require("../utils/normalize");

const SchoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    schoolCode: { type: String, required: true, trim: true },
    schoolCodeNormalized: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

SchoolSchema.pre("validate", function (next) {
  if (this.schoolCode) {
    const norm = normalizeSchoolCode(this.schoolCode);
    this.schoolCodeNormalized = norm;
    this.schoolCode = norm;
  }
  next();
});

module.exports = mongoose.model("School", SchoolSchema);
