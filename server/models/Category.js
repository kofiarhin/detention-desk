const mongoose = require("mongoose");
const { normalizeCategoryName } = require("../utils/normalize");

const CategorySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["behaviour", "reward"],
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    nameNormalized: { type: String, required: true, trim: true },

    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    detentionMinutes: { type: Number, min: 0, default: null },
    rewardMinutes: { type: Number, min: 0, default: null },
  },
  { timestamps: true },
);

CategorySchema.pre("validate", function (next) {
  if (this.name) this.nameNormalized = normalizeCategoryName(this.name);
  next();
});

CategorySchema.index(
  { schoolId: 1, type: 1, nameNormalized: 1 },
  { unique: true },
);

module.exports = mongoose.model("Category", CategorySchema);
