function parseListQuery(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || 20));
  const sortBy = String(query.sortBy || "createdAt");
  const sortOrder = String(query.sortOrder || "desc") === "asc" ? 1 : -1;

  return { page, limit, skip: (page - 1) * limit, sort: { [sortBy]: sortOrder } };
}

function buildMeta({ page, limit, total }) {
  return { page, limit, total, pages: Math.ceil(total / limit) || 0 };
}

module.exports = { parseListQuery, buildMeta };
