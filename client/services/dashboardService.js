const getAdminDashboard = async ({ token, signal }) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/admin`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload?.error?.message || 'Failed to load dashboard');
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  return payload?.data || {};
};

export { getAdminDashboard };
