const SCHOOL_CODE_PREFIX = "DK-";
const SCHOOL_CODE_LENGTH = 6;
const SCHOOL_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateSchoolCode() {
  let suffix = "";

  for (let index = 0; index < SCHOOL_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * SCHOOL_CODE_CHARSET.length);
    suffix += SCHOOL_CODE_CHARSET[randomIndex];
  }

  return `${SCHOOL_CODE_PREFIX}${suffix}`;
}

module.exports = {
  generateSchoolCode,
  SCHOOL_CODE_PREFIX,
  SCHOOL_CODE_LENGTH,
  SCHOOL_CODE_CHARSET,
};
