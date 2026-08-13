import AdminApp from "./AdminApp";
import Home from "./Home";
import StoryPlayer from "./StoryPlayer";

function App() {
  const path = window.location.pathname;

  if (path.startsWith("/admin")) {
    return <AdminApp />;
  }

  if (path.startsWith("/story/")) {
    return <StoryPlayer />;
  }

  return <Home />;
}

export default App;