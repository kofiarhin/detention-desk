import { apiRequest } from "./api";

export const listAdminParentLinks = (token) => {
  return apiRequest({ path: "/api/admin/parent-links", token });
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

export const listAdminStudents = (token) => {
  return apiRequest({ path: "/api/students?limit=200&sortBy=firstName&sortOrder=asc", token });
};
