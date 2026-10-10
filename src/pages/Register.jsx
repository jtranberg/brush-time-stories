import { useState } from "react";
import { registerUser } from "../utils/userAuth";
import "./UserAuth.css";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setStatus("");

    if (!email || !password || !confirmPassword) {
      setStatus("Complete all fields.");
      return;
    }

    if (password.length < 10) {
      setStatus("Password must be at least 10 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await registerUser(email, password);

      window.location.href = "/";
    } catch (error) {
      setStatus(error.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="user-auth-page">
      <section className="user-auth-card">
        <div className="user-auth-heading">
          <p className="user-auth-eyebrow">BrushTime Stories</p>

          <h1>Create your account</h1>

          <p>
            Save your access and enjoy BrushTime stories whenever it is
            brushing time.
          </p>
        </div>

        <form className="user-auth-form" onSubmit={handleSubmit}>
          <label htmlFor="register-email">Email</label>

          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />

          <label htmlFor="register-password">Password</label>

          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="At least 10 characters"
          />

          <label htmlFor="register-confirm-password">
            Confirm password
          </label>

          <input
            id="register-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            autoComplete="new-password"
            placeholder="Enter password again"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>

          {status && (
            <p className="user-auth-status" role="status">
              {status}
            </p>
          )}
        </form>

        <p className="user-auth-switch">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </section>
    </main>
  );
}

export default Register;