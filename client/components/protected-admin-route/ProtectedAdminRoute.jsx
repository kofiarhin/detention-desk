import './protected-admin-route.styles.scss';
import { SignedOut, useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from '../loading-spinner/LoadingSpinner';

const ProtectedAdminRoute = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    return (
      <>
        <SignedOut>
          <Navigate to="/login" replace />
        </SignedOut>
      </>
    );
  }

  const role = user?.publicMetadata?.role || user?.unsafeMetadata?.role;

  if (role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedAdminRoute;
