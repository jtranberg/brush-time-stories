import { useEffect, useState } from "react";
import AdminApp from "./AdminApp";
import Home from "./Home";
import StoryPlayer from "./StoryPlayer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { getCurrentUser } from "./utils/userAuth";

function App() {
  const path = window.location.pathname;
  const [sessionStatus, setSessionStatus] = useState("checking");

  const isPublicRoute = path === "/login" || path === "/register";
  const isAdminRoute = path.startsWith("/admin");

  useEffect(() => {
    if (isPublicRoute || isAdminRoute) {
      return;
    }

    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setSessionStatus(user ? "authenticated" : "unauthenticated");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessionStatus("unauthenticated");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isPublicRoute, isAdminRoute]);

  if (path === "/login") {
    return <Login />;
  }

  if (path === "/register") {
    return <Register />;
  }

  if (isAdminRoute) {
    return <AdminApp />;
  }

  if (sessionStatus === "checking") {
    return (
      <main className="user-auth-page">
        <section className="user-auth-card">
          <p>Checking your session...</p>
        </section>
      </main>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return <Login />;
  }

  if (path.startsWith("/story/")) {
    return <StoryPlayer />;
  }

  return <Home />;
}

export default App;