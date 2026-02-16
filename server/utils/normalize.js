function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeSchoolCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function normalizeCategoryName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function isValidSchoolCode(code) {
  const c = normalizeSchoolCode(code);
  if (!/^[A-Z0-9]{6,8}$/.test(c)) return false;
  if (/[O0I1L]/.test(c)) return false;
  return true;
}

module.exports = {
  normalizeEmail,
  normalizeSchoolCode,
  normalizeCategoryName,
  isValidSchoolCode,
};
