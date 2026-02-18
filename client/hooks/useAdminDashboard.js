import { useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { getAdminDashboard } from '../services/dashboardService';

const useAdminDashboard = () => {
  const { getToken, isLoaded } = useAuth();

  const query = useQuery({
    queryKey: ['admin-dashboard'],
    enabled: isLoaded,
    queryFn: async ({ signal }) => {
      const token = await getToken();
      return getAdminDashboard({ token, signal });
    },
    staleTime: 60_000,
  });

  return query;
};

export default useAdminDashboard;
