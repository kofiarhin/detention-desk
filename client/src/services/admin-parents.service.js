import { apiRequest } from "./api";

export const listAdminParentLinks = async (token) => {
  const payload = await apiRequest({ path: "/api/admin/parent-links", token });
  return Array.isArray(payload?.data) ? payload.data : [];
};

export const createAdminParentLink = (token, body) => {
  return apiRequest({
    path: "/api/admin/parents",
    method: "POST",
    token,
    body,
  });
};

export const revokeAdminParentLink = (token, linkId) => {
  return apiRequest({
    path: `/api/admin/parent-links/${linkId}/revoke`,
    method: "PATCH",
    token,
  });
};

export const fetchAdminParentDetails = async ({ token, parentLinkId }) => {
  const payload = await apiRequest({
    path: `/api/admin/parents/${parentLinkId}`,
    token,
  });

  return payload?.data || null;
};

export const updateAdminParent = async ({ token, parentLinkId, body }) => {
  const payload = await apiRequest({
    path: `/api/admin/parents/${parentLinkId}`,
    method: "PUT",
    token,
    body,
  });

  return payload?.data || null;
};

export const reassignAdminParentLink = async ({ token, parentLinkId, body }) => {
  const payload = await apiRequest({
    path: `/api/admin/parents/${parentLinkId}/reassign`,
    method: "PUT",
    token,
    body,
  });

  return payload?.data || null;
};

export const updateAdminParentLinkStatus = async ({ token, parentLinkId, status }) => {
  const payload = await apiRequest({
    path: `/api/admin/parents/${parentLinkId}/status`,
    method: "PATCH",
    token,
    body: { status },
  });

  return payload?.data || null;
};

export const listAdminStudents = async (token) => {
  const payload = await apiRequest({
    path: "/api/students?limit=200&sortBy=firstName&sortOrder=asc",
    token,
  });

  return Array.isArray(payload?.data) ? payload.data : [];
};
