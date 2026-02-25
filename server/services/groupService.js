const Group = require("../models/Group");

const DEFAULT_FORMS = ["A", "B", "C", "D", "E", "F"];
const MIN_YEAR = 1;
const MAX_YEAR = 13;

const normalizeForm = (form) => String(form || "").trim().toUpperCase();
const normalizeYear = (year) => Number(year);

const buildGroupCode = ({ year, form }) => `Y${year}${normalizeForm(form)}`;
const buildGroupLabel = ({ year, form }) => `Year ${year}${normalizeForm(form)}`;

const parseLegacyYearGroup = (value) => {
  const parsed = String(value || "").match(/(\d{1,2})/);
  return parsed ? Number(parsed[1]) : null;
};

const parseLegacyForm = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return null;
  const matched = normalized.match(/[A-Z]$/);
  return matched ? matched[0] : normalized;
};

async function ensureSchoolGroups({ schoolId, forms = DEFAULT_FORMS }) {
  const normalizedForms = forms.map(normalizeForm).filter(Boolean);
  const operations = [];

  for (let year = MIN_YEAR; year <= MAX_YEAR; year += 1) {
    for (const form of normalizedForms) {
      const code = buildGroupCode({ year, form });
      operations.push({
        updateOne: {
          filter: { schoolId, code },
          update: {
            $setOnInsert: {
              schoolId,
              code,
              year,
              form,
              label: buildGroupLabel({ year, form }),
            },
          },
          upsert: true,
        },
      });
    }
  }

  if (operations.length) {
    await Group.bulkWrite(operations, { ordered: false });
  }
}

async function findOrCreateGroupByLegacyFields({ schoolId, yearGroup, form }) {
  const year = parseLegacyYearGroup(yearGroup);
  const normalizedForm = parseLegacyForm(form);

  if (!year || !normalizedForm) return null;
  if (year < MIN_YEAR || year > MAX_YEAR) return null;

  const code = buildGroupCode({ year, form: normalizedForm });

  const group = await Group.findOneAndUpdate(
    { schoolId, code },
    {
      $setOnInsert: {
        schoolId,
        code,
        year,
        form: normalizedForm,
        label: buildGroupLabel({ year, form: normalizedForm }),
      },
    },
    { new: true, upsert: true },
  );

  return group;
}

module.exports = {
  DEFAULT_FORMS,
  MIN_YEAR,
  MAX_YEAR,
  normalizeYear,
  normalizeForm,
  buildGroupCode,
  buildGroupLabel,
  parseLegacyYearGroup,
  parseLegacyForm,
  ensureSchoolGroups,
  findOrCreateGroupByLegacyFields,
};
