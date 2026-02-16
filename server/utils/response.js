function successResponse(data, meta) {
  const payload = { success: true, data };
  if (meta) payload.meta = meta;
  return payload;
}

function errorResponse(code, message) {
  return { success: false, error: { code, message } };
}

module.exports = { successResponse, errorResponse };
