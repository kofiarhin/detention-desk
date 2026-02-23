import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/button/Button";
import "./reveal-school-code.styles.scss";

const RevealSchoolCodePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const schoolCode = location.state?.schoolCode || "";

  const handleCopy = async () => {
    if (!schoolCode) return;

    try {
      await navigator.clipboard.writeText(schoolCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/login", {
      state: schoolCode ? { schoolCode } : undefined,
    });
  };

  return (
    <main className="auth-wrapper">
      <section className="auth-page reveal-school-code">
        <header className="auth-page__header">
          <h1 className="auth-page__title">Your School Code</h1>
          <p className="auth-page__subtitle">
            Keep this safe. You&apos;ll need it to sign in.
          </p>
        </header>

        <p className="reveal-school-code-value">{schoolCode || "Not available"}</p>

        <div className="auth-page__actions reveal-school-code-actions">
          <Button
            disabled={!schoolCode}
            label={copied ? "Copied" : "Copy"}
            onClick={handleCopy}
          />
          <Button label="Back to Login" onClick={handleBackToLogin} variant="secondary" />
        </div>
      </section>
    </main>
  );
};

export default RevealSchoolCodePage;
