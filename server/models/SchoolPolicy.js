const mongoose = require("mongoose");

const SchoolPolicySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      unique: true,
      index: true,
    },

    defaultDetentionMinutes: { type: Number, default: 30, min: 1, max: 600 },
    rewardOffsetMinutes: { type: Number, default: 5, min: 1, max: 120 },

    teacherPermissions: {
      canCreateIncidents: { type: Boolean, default: true },
      canCreateRewards: { type: Boolean, default: true },
      canCompleteDetentions: { type: Boolean, default: false },
      canDeleteDetentions: { type: Boolean, default: false },
      canAddNotes: { type: Boolean, default: true },
      canEditOwnNotes: { type: Boolean, default: true },
      canViewAllStudents: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SchoolPolicy", SchoolPolicySchema);
