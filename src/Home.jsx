import { useEffect, useState } from "react";
import "./Home.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

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
        console.error("Unable to load BrushTime stories:", error);
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

function openStory(story) {
  window.location.assign(
    `/story/${encodeURIComponent(story.id)}`,
  );
}

  return (
    <main className="home-shell">
      <header className="home-nav">
        <a className="home-brand" href="/">
          <span className="home-brand-icon">🪥</span>

          <span>
            BrushTime
            <strong> Stories</strong>
          </span>
        </a>

        <div className="home-nav-actions">
          <a href="#stories">Story Library</a>

          <a className="home-nav-button" href="#stories">
            Start Story Time
          </a>
          <a href="/admin">
    Admin
  </a>
        </div>
      </header>

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
            <a className="home-primary-button" href="#stories">
              ▶ Start Story Time
            </a>

            <span className="home-time-note">About 3 minutes per story</span>
          </div>
        </div>

        <div className="home-hero-art">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-book">
            <div className="hero-book-page hero-book-left">✨</div>

            <div className="hero-book-page hero-book-right">🌙</div>
          </div>

          <div className="hero-toothbrush">🪥</div>

          <div className="hero-bubble bubble-one">✦</div>

          <div className="hero-bubble bubble-two">✧</div>

          <div className="hero-bubble bubble-three">✦</div>
        </div>
      </section>

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
            <span>📖</span>

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
                      ▶ Play Story
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="home-routine">
        <p className="home-eyebrow">One little routine</p>

        <h2>Three minutes. One healthy habit.</h2>

        <div className="home-routine-grid">
          <div>
            <span>🪥</span>
            <strong>Brush</strong>
            <p>Grab the toothbrush and get ready.</p>
          </div>

          <div>
            <span>📖</span>
            <strong>Listen</strong>
            <p>Follow a short story from start to finish.</p>
          </div>

          <div>
            <span>✨</span>
            <strong>Smile</strong>
            <p>Finish with a sparkling little victory.</p>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div>
          <strong>BrushTime Stories</strong>
          <span>Brush. Listen. Smile.</span>
        </div>

        <p>Story time designed around one healthy little habit.</p>
      </footer>
    </main>
  );
}

export default Home;
