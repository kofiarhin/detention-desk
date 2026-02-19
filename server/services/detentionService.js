const Category = require("../models/Category");
const SchoolPolicy = require("../models/SchoolPolicy");
const Detention = require("../models/Detention");

async function getIncidentDetentionMinutes({ schoolId, categoryId }) {
  const [policy, category] = await Promise.all([
    SchoolPolicy.findOne({ schoolId }).lean(),
    Category.findOne({ _id: categoryId, schoolId, type: "behaviour" }).lean(),
  ]);

  if (!policy || !category) return null;
  if (Number.isFinite(category.detentionMinutes) && category.detentionMinutes > 0) {
    return category.detentionMinutes;
  }
  return policy.defaultDetentionMinutes;
}

async function createDetentionForIncident({ schoolId, studentId, assignedTeacherId, incidentId, createdBy, minutes }) {
  return Detention.create({
    schoolId,
    studentId,
    incidentId,
    assignedTeacherId,
    minutesAssigned: minutes,
    minutesRemaining: minutes,
    status: "pending",
    createdBy,
  });
}

module.exports = { getIncidentDetentionMinutes, createDetentionForIncident };
