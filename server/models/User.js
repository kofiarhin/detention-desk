const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { normalizeEmail } = require("../utils/normalize");

const UserSchema = new mongoose.Schema(
  {
    // Owner users are global (schoolId=null)
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
      index: true,
    },

    name: { type: String, required: true, trim: true },

    email: { type: String, required: true, trim: true },
    emailNormalized: { type: String, required: true, trim: true, index: true },

    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["owner", "schoolAdmin", "teacher", "parent"],
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

UserSchema.pre("validate", function (next) {
  if (this.email) {
    const norm = normalizeEmail(this.email);
    this.emailNormalized = norm;
    this.email = norm;
  }
  next();
});

// unique per-school email (only when schoolId present)
UserSchema.index(
  { schoolId: 1, emailNormalized: 1 },
  {
    unique: true,
    partialFilterExpression: { schoolId: { $exists: true, $ne: null } },
  },
);

// unique owner email globally
UserSchema.index(
  { role: 1, emailNormalized: 1 },
  { unique: true, partialFilterExpression: { role: "owner" } },
);

UserSchema.methods.verifyPassword = async function (plain) {
  return bcrypt.compare(String(plain || ""), this.passwordHash);
};

UserSchema.statics.hashPassword = async function (plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(String(plain || ""), salt);
};

module.exports = mongoose.model("User", UserSchema);
