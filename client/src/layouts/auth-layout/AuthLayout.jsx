// client/src/layouts/auth-layout/AuthLayout.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./auth-layout.styles.scss";

const AuthLayout = () => {
  const { isAuthenticated, isBootstrapping, user, getRoleHome } = useAuth();

  if (isBootstrapping) {
    return <section className="auth-layout-state">Loading session...</section>;
  }

  if (isAuthenticated) {
    return <Navigate replace to={getRoleHome(user)} />;
  }

  return (
    <section className="auth-layout">
      <div className="auth-layout-card">
        <Outlet />
      </div>
    </section>
  );
};

export default AuthLayout;
