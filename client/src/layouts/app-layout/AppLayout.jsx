import { Outlet } from "react-router-dom";
import Sidebar from "../../components/sidebar/Sidebar";
import Topbar from "../../components/topbar/Topbar";
import { useAuth } from "../../context/AuthContext";
import "./app-layout.styles.scss";

const AppLayout = () => {
  const { user } = useAuth();
  const isParentLocked = Boolean(
    user?.role === "parent" && user?.mustChangePassword,
  );

  return (
    <div className="app-layout">
      {isParentLocked ? null : <Sidebar />}
      <div className="app-layout-content-wrap">
        <Topbar isParentLocked={isParentLocked} />
        <main className="app-layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
