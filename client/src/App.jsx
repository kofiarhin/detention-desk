// client/src/App.jsx
import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./app/routes/RequireAuth";
import AppLayout from "./layouts/app-layout/AppLayout";
import AuthLayout from "./layouts/auth-layout/AuthLayout";
import PublicLayout from "./layouts/public-layout/PublicLayout";
import AboutPage from "./pages/about/AboutPage";
import HomePage from "./pages/home/HomePage";
import FeaturesPage from "./pages/features/FeaturesPage";
import LoginPage from "./pages/login/LoginPage";
import RegisterPage from "./pages/register/RegisterPage";
import ForgotSchoolCodePage from "./pages/forgot-school-code/ForgotSchoolCodePage";
import RevealSchoolCodePage from "./pages/reveal-school-code/RevealSchoolCodePage";
import AdminDashboardPage from "./pages/admin/DashboardPage";
import AdminDetentionsPage from "./pages/admin/DetentionsPage";
import AdminStudentsPage from "./pages/admin/StudentsPage";
import AdminTeachersPage from "./pages/admin/TeachersPage";
import ParentChangePasswordPage from "./pages/parent/ChangePasswordPage";
import ParentStudentDetailPage from "./pages/parent/StudentDetailPage";
import ParentStudentsPage from "./pages/parent/StudentsPage";
import TeacherStudentProfilePage from "./pages/teacher/StudentProfilePage";
import TeacherStudentsPage from "./pages/teacher/StudentsPage";

const App = () => {
  return (
    <Routes>
      {/* ✅ PublicLayout is now the global shell (Navbar + Footer always visible) */}
      <Route element={<PublicLayout />}>
        {/* Public marketing pages */}
        <Route element={<HomePage />} path="/" />
        <Route element={<AboutPage />} path="/about" />
        <Route element={<FeaturesPage />} path="/features" />

        {/* Auth pages still use AuthLayout for card positioning, but inside PublicLayout */}
        <Route element={<AuthLayout />}>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<RegisterPage />} path="/register" />
          <Route
            element={<ForgotSchoolCodePage />}
            path="/forgot-school-code"
          />
          <Route element={<RevealSchoolCodePage />} path="/reveal-school-code" />
        </Route>

        {/* Protected app area (still inside PublicLayout so header/footer stay) */}
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route element={<Navigate replace to="/login" />} path="/app/*" />

            <Route element={<RequireAuth allowedRoles={["schoolAdmin"]} />}>
              <Route element={<AdminDashboardPage />} path="/admin/dashboard" />
              <Route element={<AdminTeachersPage />} path="/admin/teachers" />
              <Route element={<AdminStudentsPage />} path="/admin/students" />
              <Route
                element={<AdminDetentionsPage />}
                path="/admin/detentions"
              />
            </Route>

            <Route element={<RequireAuth allowedRoles={["teacher"]} />}>
              <Route
                element={<TeacherStudentsPage />}
                path="/teacher/students"
              />
              <Route
                element={<TeacherStudentProfilePage />}
                path="/teacher/students/:id"
              />
            </Route>

            <Route element={<RequireAuth allowedRoles={["parent"]} />}>
              <Route
                element={<ParentChangePasswordPage />}
                path="/parent/change-password"
              />
              <Route element={<ParentStudentsPage />} path="/parent/students" />
              <Route
                element={<ParentStudentDetailPage />}
                path="/parent/students/:id"
              />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route element={<Navigate replace to="/login" />} path="*" />
      </Route>
    </Routes>
  );
};

export default App;
