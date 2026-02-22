import { Outlet } from "react-router-dom";
import Footer from "../../components/footer/Footer";
import Navbar from "../../components/navbar/Navbar";
import "./public-layout.styles.scss";

const PublicLayout = () => {
  return (
    <div className="public-layout">
      <Navbar />
      <main className="public-layout-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
