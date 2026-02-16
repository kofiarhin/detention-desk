const Category = require("../models/Category");
const { successResponse, errorResponse } = require("../utils/response");
const { normalizeCategoryName } = require("../utils/normalize");

exports.listCategories = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const type = String(req.query.type || "").trim();

    const filter = { schoolId };
    if (type) filter.type = type;

    const items = await Category.find(filter)
      .sort({ type: 1, sortOrder: 1, name: 1 })
      .lean();
    return res.json(successResponse(items));
  } catch (err) {
    console.error("[listCategories] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not load categories"));
  }
};

exports.createCategory = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { type, name, sortOrder } = req.body || {};

    if (!type || !name) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", "Missing required fields"));
    }

    const cat = await Category.create({
      schoolId,
      type,
      name: String(name).trim(),
      nameNormalized: normalizeCategoryName(name),
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive: true,
    });

    return res.status(201).json(successResponse(cat));
  } catch (err) {
    console.error("[createCategory] error:", err);
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json(errorResponse("DUPLICATE", "Category already exists"));
    }
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not create category"));
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const id = req.params.id;

    const allowed = ["name", "sortOrder", "isActive"];
    const patch = {};

    for (const key of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
        patch[key] = req.body[key];
      }
    }

    if (patch.name) {
      patch.name = String(patch.name).trim();
      patch.nameNormalized = normalizeCategoryName(patch.name);
    }

    const updated = await Category.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: patch },
      { new: true },
    ).lean();

    if (!updated)
      return res
        .status(404)
        .json(errorResponse("NOT_FOUND", "Category not found"));
    return res.json(successResponse(updated));
  } catch (err) {
    console.error("[updateCategory] error:", err);
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json(errorResponse("DUPLICATE", "Category already exists"));
    }
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not update category"));
  }
};

exports.toggleCategory = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const id = req.params.id;

    const cat = await Category.findOne({ _id: id, schoolId });
    if (!cat)
      return res
        .status(404)
        .json(errorResponse("NOT_FOUND", "Category not found"));

    cat.isActive = !cat.isActive;
    await cat.save();

    return res.json(successResponse(cat));
  } catch (err) {
    console.error("[toggleCategory] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not toggle category"));
  }
};
