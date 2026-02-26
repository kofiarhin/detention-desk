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
import TeacherDetailsPage from "./pages/admin/TeacherDetailsPage";
import AdminParentsPage from "./pages/admin/ParentsPage";
import ParentChangePasswordPage from "./pages/parent/ChangePasswordPage";
import ParentStudentDetailPage from "./pages/parent/StudentDetailPage";
import ParentStudentsPage from "./pages/parent/StudentsPage";
import TeacherStudentProfilePage from "./pages/teacher/StudentProfilePage";
import TeacherStudentsPage from "./pages/teacher/StudentsPage";

const App = () => {
  return (
    <Routes>
      {/* Public marketing + auth shell */}
      <Route element={<PublicLayout />}>
        <Route element={<HomePage />} path="/" />
        <Route element={<AboutPage />} path="/about" />
        <Route element={<FeaturesPage />} path="/features" />

        <Route element={<AuthLayout />}>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<RegisterPage />} path="/register" />
          <Route
            element={<ForgotSchoolCodePage />}
            path="/forgot-school-code"
          />
          <Route
            element={<RevealSchoolCodePage />}
            path="/reveal-school-code"
          />
        </Route>
      </Route>

      {/* Protected app shell (NO public navbar/footer) */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route element={<RequireAuth allowedRoles={["schoolAdmin"]} />}>
            <Route element={<AdminDashboardPage />} path="/admin/dashboard" />
            <Route element={<AdminTeachersPage />} path="/admin/teachers" />
            <Route element={<TeacherDetailsPage />} path="/admin/teachers/:teacherId" />
            <Route element={<AdminStudentsPage />} path="/admin/students" />

            {/* ✅ allow admin to view/manage a student profile (reuse teacher profile page) */}
            <Route
              element={<TeacherStudentProfilePage />}
              path="/admin/students/:id"
            />

            <Route element={<AdminDetentionsPage />} path="/admin/detentions" />
            <Route element={<AdminParentsPage />} path="/admin/parents" />
          </Route>

          <Route element={<RequireAuth allowedRoles={["teacher"]} />}>
            <Route element={<TeacherStudentsPage />} path="/teacher/students" />
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
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
};

export default App;
