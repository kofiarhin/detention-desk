const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    code: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 13, index: true },
    form: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    ownerTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

GroupSchema.index({ schoolId: 1, code: 1 }, { unique: true });
GroupSchema.index(
  { schoolId: 1, ownerTeacherId: 1 },
  {
    unique: true,
    partialFilterExpression: { ownerTeacherId: { $type: "objectId" } },
  },
);

module.exports = mongoose.model("Group", GroupSchema);
