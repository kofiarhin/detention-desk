/* eslint-disable react-hooks/set-state-in-effect */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/button/Button";
import Input from "../../components/input/Input";
import { useAuth } from "../../context/AuthContext";
import "./login-page.styles.scss";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, getRoleHome, sessionMessage } = useAuth();

  const [form, setForm] = useState({ schoolCode: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const nextSession = await login(form);
      navigate(getRoleHome(nextSession.user), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-wrapper">
      <form className="auth-page" onSubmit={onSubmit}>
        <header className="auth-page__header">
          <h1 className="auth-page__title">Sign in</h1>
          <p className="auth-page__subtitle">
            Enter your credentials to access your workspace.
          </p>
        </header>

        {(sessionMessage || error) && (
          <p className="auth-page__error">{sessionMessage || error}</p>
        )}

        <Input
          id="schoolCode"
          label="School Code"
          name="schoolCode"
          onChange={onChange}
          required
          value={form.schoolCode}
          placeholder="SCH-000"
        />

        <Input
          id="email"
          label="Email Address"
          name="email"
          onChange={onChange}
          required
          type="email"
          value={form.email}
          placeholder="teacher@school.com"
        />

        <Input
          id="password"
          label="Password"
          name="password"
          onChange={onChange}
          required
          type="password"
          value={form.password}
          placeholder="••••••••"
        />

        <div className="auth-page__actions">
          <Button
            disabled={loading}
            label={loading ? "Verifying..." : "Sign In"}
            type="submit"
          />
        </div>

        <footer className="auth-page__helper">
          Don't have an account?{" "}
          <Link to="/register">Register your school</Link>
        </footer>
      </form>
    </main>
  );
};

export default LoginPage;
