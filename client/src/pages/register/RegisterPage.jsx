import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/button/Button";
import Input from "../../components/input/Input";
import { useAuth } from "../../context/AuthContext";
import "./register-page.styles.scss";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatedSchoolCode, setGeneratedSchoolCode] = useState("");

  const [form, setForm] = useState({
    schoolName: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const onCopySchoolCode = async () => {
    if (!generatedSchoolCode) return;

    try {
      await navigator.clipboard.writeText(generatedSchoolCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await register(form);
      setGeneratedSchoolCode(session?.school?.schoolCode || "");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (generatedSchoolCode) {
    return (
      <main className="auth-wrapper auth-wrapper--register">
        <section className="auth-page auth-page--register">
          <header className="auth-page__header">
            <h1 className="auth-page__title">School created</h1>
            <p className="auth-page__subtitle">
              Save this code. You'll use it to log in.
            </p>
          </header>

          <div className="auth-page__success">
            <p className="auth-page__success-label">Your School Code</p>
            <p className="auth-page__success-code">{generatedSchoolCode}</p>

            <div className="auth-page__success-actions">
              <Button
                label={copied ? "Copied!" : "Copy code"}
                onClick={onCopySchoolCode}
                type="button"
              />
            </div>
          </div>

          <div className="auth-page__actions auth-page__actions--stack">
            <Button
              label="Go to Login"
              onClick={() => navigate("/login")}
              type="button"
            />
            <Button
              label="Continue to Dashboard"
              onClick={() => navigate("/admin/dashboard")}
              type="button"
            />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-wrapper auth-wrapper--register">
      <form className="auth-page auth-page--register" onSubmit={onSubmit}>
        <header className="auth-page__header">
          <h1 className="auth-page__title">Create your school</h1>
          <p className="auth-page__subtitle">
            Set up your admin account in under a minute.
          </p>
        </header>

        {error ? <p className="auth-page__error">{error}</p> : null}

        <Input
          id="schoolName"
          label="School Name"
          name="schoolName"
          onChange={onChange}
          required
          value={form.schoolName}
          placeholder="Detention Desk Academy"
        />

        <Input
          id="adminName"
          label="Admin Full Name"
          name="adminName"
          onChange={onChange}
          required
          value={form.adminName}
          placeholder="Jane Doe"
        />

        <Input
          id="adminEmail"
          label="Admin Email"
          name="adminEmail"
          onChange={onChange}
          required
          type="email"
          value={form.adminEmail}
          placeholder="admin@school.com"
        />

        <Input
          id="adminPassword"
          label="Admin Password"
          name="adminPassword"
          onChange={onChange}
          required
          type="password"
          value={form.adminPassword}
          placeholder="Create a strong password"
        />

        <div className="auth-page__actions">
          <Button
            disabled={loading}
            label={loading ? "Creating..." : "Create School"}
            type="submit"
          />
        </div>

        <footer className="auth-page__helper">
          Already registered? <Link to="/login">Login</Link>
        </footer>
      </form>
    </main>
  );
};

export default RegisterPage;
