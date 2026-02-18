import { SignIn, SignedIn } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

const LoginPage = () => {
  return (
    <div className="auth-page">
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>
      <SignIn routing="path" path="/login" />
    </div>
  );
};

export default LoginPage;
