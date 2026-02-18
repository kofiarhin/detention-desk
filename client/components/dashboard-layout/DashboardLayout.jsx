import './dashboard-layout.styles.scss';

const DashboardLayout = ({ title, children }) => {
  return (
    <main className="dashboard-layout">
      <div className="dashboard-layout-inner">
        <h1 className="dashboard-title">{title}</h1>
        {children}
      </div>
    </main>
  );
};

export default DashboardLayout;
