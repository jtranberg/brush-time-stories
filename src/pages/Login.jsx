import { useState } from "react";
import { loginUser } from "../utils/userAuth";
import "./UserAuth.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setStatus("");

    if (!email || !password) {
      setStatus("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      await loginUser(email, password);

      window.location.href = "/";
    } catch (error) {
      setStatus(error.message || "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="user-auth-page">
      <section className="user-auth-card">
        <div className="user-auth-heading">
          <p className="user-auth-eyebrow">BrushTime Stories</p>

          <h1>Welcome back</h1>

          <p>
            Sign in to your BrushTime account and get back to story time.
          </p>
        </div>

        <form className="user-auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>

          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />

          <label htmlFor="login-password">Password</label>

          <input
            id="login-password"
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
            <p className="user-auth-status" role="status">
              {status}
            </p>
          )}
        </form>

        <p className="user-auth-switch">
          New to BrushTime? <a href="/register">Create an account</a>
        </p>
      </section>
    </main>
  );
}

export default Login;