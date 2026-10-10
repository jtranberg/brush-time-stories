import { useEffect, useState } from "react";
import { getCurrentUser, userLogout } from "./utils/userAuth";
import "./Home.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5050";

function getAssetUrl(assetPath) {
  if (!assetPath) {
    return "";
  }

  if (assetPath.startsWith("http://") || assetPath.startsWith("https://")) {
    return assetPath;
  }

  return `${API_URL}${assetPath}`;
}

function Home() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);

  /* =========================================================
     LOAD USER SESSION
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load user session:", error);
        }
      } finally {
        if (!cancelled) {
          setCheckingUser(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     LOAD STORY LIBRARY
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/api/stories`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load stories.");
        }

        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setStories(data.stories || []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Unable to load BrushTime stories:", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     USER CONTROLS
     ========================================================= */

  function handleLogout() {
    userLogout();
    window.location.replace("/login");
  }

  function openStory(story) {
    window.location.assign(`/story/${encodeURIComponent(story.id)}`);
  }

  /* =========================================================
     HOME
     ========================================================= */

  return (
    <main className="home-shell">
      {/* =====================================================
          NAVIGATION
          ===================================================== */}

      <header className="home-nav">
        <a className="home-brand" href="/">
          <span className="home-brand-icon">BT</span>

          <span>
            BrushTime
            <strong> Stories</strong>
          </span>
        </a>

        <div className="home-nav-actions">
          <a href="#stories">Story Library</a>

          {!checkingUser && !user && (
            <>
              <a href="/login">Login</a>

              <a className="home-nav-button" href="/register">
                Create Account
              </a>
            </>
          )}

          {!checkingUser && user && (
            <>
              <span className="home-user-email">{user.email}</span>

              {/* <a href="/account">Account</a> */}

              <button
                className="home-logout-button"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}

          <a href="/admin">Admin</a>
        </div>
      </header>

      {/* =====================================================
          HERO INTRODUCTION
          ===================================================== */}

      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-eyebrow">Three-minute stories for brushing time</p>

          <h1>
            Make brushing teeth
            <span> story time.</span>
          </h1>

          <p className="home-hero-description">
            Short, narrated adventures that keep little imaginations busy while
            healthy smiles get brighter.
          </p>

          <div className="home-hero-actions">
            <span className="home-time-note">About 3 minutes per story</span>
          </div>
        </div>

        <div className="home-hero-art">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-book">
            <div className="hero-book-page hero-book-left">&#10024;</div>

            <div className="hero-book-page hero-book-right">&#127769;</div>
          </div>

          <div className="hero-toothbrush">&#129701;</div>

          <div className="hero-bubble bubble-one">&#10022;</div>

          <div className="hero-bubble bubble-two">&#10023;</div>

          <div className="hero-bubble bubble-three">&#10022;</div>
        </div>
      </section>

      {/* =====================================================
          BRUSHTIME INSTRUCTIONS
          Explain the routine before presenting the stories.
          ===================================================== */}

      <section className="home-routine">
        <p className="home-eyebrow">One little routine</p>

        <h2>Three minutes. One healthy habit.</h2>

        <div className="home-routine-grid">
          <div>
            <span>&#129701;</span>

            <strong>Brush</strong>

            <p>Grab the toothbrush and get ready.</p>
          </div>

          <div>
            <span>&#128214;</span>

            <strong>Listen</strong>

            <p>Follow a short story from start to finish.</p>
          </div>

          <div>
            <span>&#10024;</span>

            <strong>Smile</strong>

            <p>Finish with a sparkling little victory.</p>
          </div>
        </div>
      </section>

      {/* =====================================================
          STORY LIBRARY
          Keep stories as the final main action on the page.
          ===================================================== */}

      <section className="home-stories" id="stories">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">Tonight&apos;s Stories</p>

            <h2>Pick an adventure.</h2>
          </div>

          <p>Choose a story, grab the toothbrush, and press play.</p>
        </div>

        {loading && (
          <div className="home-empty-state">Loading story time...</div>
        )}

        {!loading && stories.length === 0 && (
          <div className="home-empty-state">
            <span>BrushTime Stories</span>

            <h3>New stories are coming.</h3>

            <p>
              The BrushTime library is being prepared for tonight&apos;s
              adventure.
            </p>
          </div>
        )}

        {!loading && stories.length > 0 && (
          <div className="home-story-grid">
            {stories.map((story) => {
              const coverImage = story.pages?.[0]?.image;

              return (
                <article className="home-story-card" key={story.id}>
                  <div className="home-story-cover">
                    {coverImage && (
                      <img src={getAssetUrl(coverImage)} alt={story.title} />
                    )}

                    <span className="home-story-time">3 min</span>
                  </div>

                  <div className="home-story-content">
                    <div>
                      <p className="home-story-meta">
                        {story.pageCount}{" "}
                        {story.pageCount === 1 ? "page" : "pages"}
                      </p>

                      <h3>{story.title}</h3>

                      <p>A little adventure for a brighter smile.</p>
                    </div>

                    <button
                      className="home-story-play"
                      type="button"
                      onClick={() => openStory(story)}
                    >
                      &#9654; Play Story
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      {/* =====================================================
    FOOTER
    ===================================================== */}

      {/* =====================================================
    FOOTER
    ===================================================== */}

<footer className="home-footer">
  <div className="home-footer-brand">
    <strong>BrushTime Stories</strong>

    <span>Brush. Listen. Smile.</span>
  </div>

  <div className="home-footer-message">
    <p>
      Three-minute stories designed around one healthy little habit.
    </p>

    <span>
      &copy; {new Date().getFullYear()} BrushTime Stories
    </span>
  </div>

  <div className="home-footer-credit">
    <span>
      Stories by <strong>Robert Haugen</strong>
    </span>

    <span>Designed and developed by App Intelligence</span>

    <a
      href="https://appintelligence.ca"
      target="_blank"
      rel="noopener noreferrer"
    >
      appintelligence.ca
    </a>
  </div>
</footer>
    </main>
  );
}

export default Home;
