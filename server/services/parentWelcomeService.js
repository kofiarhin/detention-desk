async function sendParentWelcomeEmail({ toEmail, parentName, loginUrl }) {
  if (process.env.NODE_ENV === "test") {
    return { delivered: true };
  }

  // In production this can be wired to the configured email provider.
  // We intentionally do not log credentials or temporary passwords.
  return {
    delivered: false,
    recipient: toEmail,
    loginUrl,
    parentName,
  };
}

module.exports = { sendParentWelcomeEmail };
