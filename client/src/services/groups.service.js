import { apiRequest } from "./api";

export const fetchAdminGroups = async ({ token }) => {
  const payload = await apiRequest({
    path: "/api/admin/groups",
    token,
  });

  const items = Array.isArray(payload?.data) ? payload.data : [];

  return items.map((group) => ({
    ...group,
    id: group._id,
    label: group.label || `Year ${group.year}${group.form}`,
  }));
};

export const assignGroupOwner = async ({ token, groupId, ownerTeacherId }) => {
  return apiRequest({
    path: `/api/admin/groups/${groupId}/assign-owner`,
    method: "PATCH",
    token,
    body: { ownerTeacherId },
  });
};
