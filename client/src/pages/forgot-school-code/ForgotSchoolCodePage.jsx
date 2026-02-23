import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/button/Button";
import Input from "../../components/input/Input";
import { forgotSchoolCode } from "../../services/auth.service";
import "./forgot-school-code.styles.scss";

const ForgotSchoolCodePage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = await forgotSchoolCode(form);
      navigate("/reveal-school-code", {
        replace: true,
        state: { schoolCode: payload.schoolCode },
      });
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-wrapper">
      <form className="auth-page forgot-school-code" onSubmit={handleSubmit}>
        <header className="auth-page__header">
          <h1 className="auth-page__title">Forgot school code</h1>
          <p className="auth-page__subtitle">
            Confirm your account details to reveal your school code.
          </p>
        </header>

        {error ? <p className="auth-page__error">{error}</p> : null}

        <Input
          id="email"
          label="Email Address"
          name="email"
          onChange={handleChange}
          placeholder="teacher@school.com"
          required
          type="email"
          value={form.email}
        />

        <Input
          id="password"
          label="Password"
          name="password"
          onChange={handleChange}
          placeholder="••••••••"
          required
          type="password"
          value={form.password}
        />

        <div className="auth-page__actions">
          <Button
            disabled={loading}
            label={loading ? "Verifying..." : "Verify"}
            type="submit"
          />
        </div>
      </form>
    </main>
  );
};

export default ForgotSchoolCodePage;
