import { apiRequest } from "./api";

export const fetchAdminTeachers = async ({ token }) => {
  const payload = await apiRequest({
    path: "/api/admin/teachers",
    token,
  });

  return Array.isArray(payload?.data) ? payload.data : [];
};

export const fetchAdminTeacherDetails = async ({ token, teacherId }) => {
  const payload = await apiRequest({
    path: `/api/admin/teachers/${teacherId}`,
    token,
  });

  return payload?.data || null;
};

export const updateAdminTeacher = async ({ token, teacherId, body }) => {
  const payload = await apiRequest({
    path: `/api/admin/teachers/${teacherId}`,
    method: "PUT",
    token,
    body,
  });

  return payload?.data || null;
};

export const reassignAdminTeacherGroup = async ({ token, teacherId, body }) => {
  const payload = await apiRequest({
    path: `/api/admin/teachers/${teacherId}/group`,
    method: "PUT",
    token,
    body,
  });

  return payload?.data || null;
};

export const updateAdminTeacherStatus = async ({ token, teacherId, isActive }) => {
  const payload = await apiRequest({
    path: `/api/admin/teachers/${teacherId}/status`,
    method: "PATCH",
    token,
    body: { isActive },
  });

  return payload?.data || null;
};
