import { useState } from "react";
import { adminLogin } from "../utils/adminAuth";
import "./AdminLogin.css";

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email || !password) {
      setStatus("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setStatus("");

      const result = await adminLogin(email, password);

      setStatus("Login successful.");

      if (onLogin) {
        onLogin(result.admin);
      }
    } catch (error) {
      setStatus(error.message || "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-heading">
          <p className="admin-login-eyebrow">BrushTime Stories</p>

          <h1>Publisher Login</h1>

          <p className="admin-login-subtitle">
            Sign in to manage the BrushTime story library.
          </p>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label htmlFor="admin-email">Email</label>

          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="Publisher email"
          />

          <label htmlFor="admin-password">Password</label>

          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Password"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {status && (
            <p className="admin-login-status" role="status">
              {status}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}

export default AdminLogin;