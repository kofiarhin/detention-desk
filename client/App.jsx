import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedAdminRoute from './components/protected-admin-route/ProtectedAdminRoute';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import StudentProfilePage from './pages/StudentProfilePage';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/students/:studentId" element={<StudentProfilePage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
