import { useCallback, useEffect, useRef, useState } from "react";
import StoryUpload from "./components/StoryUpload";
import AdminLogin from "./pages/AdminLogin";
import { adminLogout, getAdminToken, getCurrentAdmin } from "./utils/adminAuth";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

/* =========================================================
   HELPERS
   ========================================================= */

function formatTime(seconds = 0) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getAssetUrl(assetPath) {
  if (!assetPath) {
    return "";
  }

  if (assetPath.startsWith("http://") || assetPath.startsWith("https://")) {
    return assetPath;
  }

  return `${API_URL}${assetPath}`;
}

/* =========================================================
   ADMIN APP
   ========================================================= */

function AdminApp() {
  const [admin, setAdmin] = useState(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);

  const [selectedStory, setSelectedStory] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef(null);
  const voicesRef = useRef([]);

  const currentPage = selectedStory?.pages?.[currentPageIndex] || null;
  const storyDuration = selectedStory?.durationSeconds || 180;

  /* =========================================================
     ADMIN SESSION
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      try {
        if (!getAdminToken()) {
          if (!cancelled) {
            setCheckingAdmin(false);
          }

          return;
        }

        const currentAdmin = await getCurrentAdmin();

        if (!cancelled) {
          setAdmin(currentAdmin);
        }
      } catch (error) {
        console.error("Unable to verify admin session:", error);
      } finally {
        if (!cancelled) {
          setCheckingAdmin(false);
        }
      }
    }

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleAdminLogout() {
    adminLogout();

    window.speechSynthesis.cancel();

    setAdmin(null);
    setSelectedStory(null);
    setCurrentPageIndex(0);
    setElapsedSeconds(0);
    setIsPlaying(false);
  }

  function handleBackToHome() {
    window.speechSynthesis.cancel();
    window.location.assign("/");
  }

  /* =========================================================
     LOAD STORY LIBRARY
     ========================================================= */

  const loadStories = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoadingStories(true);
      }

      const response = await fetch(`${API_URL}/api/stories`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load stories.");
      }

      setStories(data.stories || []);
    } catch (error) {
      console.error("Unable to load story library:", error);
    } finally {
      setLoadingStories(false);
    }
  }, []);

  /* =========================================================
     LOAD SPEECH VOICES
     ========================================================= */

  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();

    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  /* =========================================================
     INITIAL STORY LOAD
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
          console.error("Unable to load story library:", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingStories(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     PLAYBACK TIMER
     ========================================================= */

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      return undefined;
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying]);

  /* =========================================================
     STORY CONTROLS
     ========================================================= */

  function startStory(story) {
    setSelectedStory(story);
    setCurrentPageIndex(0);
    setElapsedSeconds(0);
    setIsPlaying(false);
  }

  function speakPage(pageIndex) {
    if (!selectedStory) {
      return;
    }

    const page = selectedStory.pages?.[pageIndex];

    if (!page?.text?.trim()) {
      setIsPlaying(false);
      return;
    }

    const pageParts = page.text.match(/^(.*?)\bpage\s+\d+\b(.*)$/is);

    let title = "";
    let body = "";

    if (pageParts) {
      title = pageParts[1].trim();
      body = pageParts[2].trim();
    } else {
      body = page.text.trim();
    }

    const preferredVoice =
      voicesRef.current.find(
        (voice) =>
          voice.lang.startsWith("en") &&
          /female|samantha|zira|aria|jenny|ava/i.test(voice.name),
      ) ||
      voicesRef.current.find((voice) => voice.lang.startsWith("en")) ||
      null;

    const finishPage = () => {
      const nextPageIndex = pageIndex + 1;

      if (nextPageIndex >= selectedStory.pages.length) {
        setIsPlaying(false);
        return;
      }

      setCurrentPageIndex(nextPageIndex);

      setTimeout(() => {
        speakPage(nextPageIndex);
      }, 300);
    };

    const speakBody = () => {
      if (!body) {
        finishPage();
        return;
      }

      const bodyUtterance = new SpeechSynthesisUtterance(body);

      if (preferredVoice) {
        bodyUtterance.voice = preferredVoice;
      }

      bodyUtterance.rate = 0.9;
      bodyUtterance.pitch = 1.05;
      bodyUtterance.volume = 1;

      bodyUtterance.onend = finishPage;

      bodyUtterance.onerror = (event) => {
        console.error("Narration error:", event);
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(bodyUtterance);
    };

    const titleUtterance = new SpeechSynthesisUtterance(title);

    if (preferredVoice) {
      titleUtterance.voice = preferredVoice;
    }

    titleUtterance.rate = 0.9;
    titleUtterance.pitch = 1.05;
    titleUtterance.volume = 1;

    titleUtterance.onend = () => {
      setTimeout(() => {
        speakBody();
      }, 700);
    };

    titleUtterance.onerror = (event) => {
      console.error("Narration error:", event);
      setIsPlaying(false);
    };

    setIsPlaying(true);

    window.speechSynthesis.speak(titleUtterance);
  }

  function handlePlay() {
    window.speechSynthesis.cancel();
    speakPage(currentPageIndex);
  }

  function handlePause() {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }

  function handlePreviousPage() {
    if (currentPageIndex <= 0) {
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentPageIndex((current) => current - 1);
  }

  function handleNextPage() {
    if (!selectedStory) {
      return;
    }

    if (currentPageIndex >= selectedStory.pages.length - 1) {
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentPageIndex((current) => current + 1);
  }

  function handleRestart() {
    if (!selectedStory) {
      return;
    }

    window.speechSynthesis.cancel();

    setCurrentPageIndex(0);
    setElapsedSeconds(0);
    setIsPlaying(false);
  }

  function handleBack() {
    window.speechSynthesis.cancel();

    setSelectedStory(null);
    setCurrentPageIndex(0);
    setElapsedSeconds(0);
    setIsPlaying(false);
  }

  /* =========================================================
     DELETE STORY
     ========================================================= */

  async function handleDeleteStory(story) {
    const confirmed = window.confirm(`Delete "${story.title}"?`);

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/stories/${story.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete story.");
      }

      setStories((currentStories) =>
        currentStories.filter((item) => item.id !== story.id),
      );
    } catch (error) {
      console.error("Unable to delete story:", error);

      window.alert(error.message || "Unable to delete story.");
    }
  }

  /* =========================================================
     AUTH GATE
     ========================================================= */

  if (checkingAdmin) {
    return (
      <main className="app-shell">
        <p>Checking publisher session...</p>
      </main>
    );
  }

  if (!admin) {
    return (
      <AdminLogin
        onLogin={(loggedInAdmin) => {
          setAdmin(loggedInAdmin);
        }}
      />
    );
  }

  /* =========================================================
     STORY PLAYER
     ========================================================= */

  if (selectedStory && currentPage) {
    const progress = Math.min((elapsedSeconds / storyDuration) * 100, 100);

    const hasNarration = Boolean(currentPage.text?.trim());

    return (
      <main className="app-shell">
        <section className="player">
          <div className="admin-toolbar">
            <span>{admin.email}</span>

            <button
              className="secondary-button"
              type="button"
              onClick={handleBackToHome}
            >
              â† Back to Home
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={handleAdminLogout}
            >
              Logout
            </button>
          </div>

          <button className="back-button" type="button" onClick={handleBack}>
            â† Back to Stories
          </button>

          <div className="story-stage">
            <div className="story-page">
              <img
                src={getAssetUrl(currentPage.image)}
                alt={`${selectedStory.title} page ${currentPageIndex + 1}`}
              />
            </div>

            <div className="story-meta">
              <p className="eyebrow">BrushTime Stories</p>

              <h1>{selectedStory.title}</h1>

              <p>
                Page {currentPageIndex + 1} of {selectedStory.pages.length}
              </p>
            </div>

            <div className="progress-wrap">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className="progress-time">
                <span>{formatTime(elapsedSeconds)}</span>
                <span>{formatTime(storyDuration)}</span>
              </div>
            </div>

            {!hasNarration && (
              <p className="story-processing-note">
                Story pages are ready. Narration will be added next.
              </p>
            )}

            <div className="player-controls">
              <button
                className="secondary-button"
                type="button"
                onClick={handlePreviousPage}
                disabled={currentPageIndex === 0}
              >
                Previous
              </button>

              {hasNarration && (
                <>
                  {!isPlaying ? (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={handlePlay}
                    >
                      Play
                    </button>
                  ) : (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={handlePause}
                    >
                      Pause
                    </button>
                  )}
                </>
              )}

              <button
                className="secondary-button"
                type="button"
                onClick={handleNextPage}
                disabled={currentPageIndex === selectedStory.pages.length - 1}
              >
                Next
              </button>

              <button
                className="secondary-button"
                type="button"
                onClick={handleRestart}
              >
                Restart
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* =========================================================
     ADMIN STORY LIBRARY
     ========================================================= */

  return (
    <main className="app-shell">
      <section className="hero-section">
        <div className="admin-toolbar">
          <div className="admin-toolbar-copy">
            <span className="admin-toolbar-label">Publisher</span>
            <span className="admin-toolbar-email">{admin.email}</span>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={handleBackToHome}
          >
            Back to Home
          </button>

          <button
            className="admin-logout-button"
            type="button"
            onClick={handleAdminLogout}
          >
            Logout
          </button>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">Three-minute stories for brushing time</p>

          <h1>
            Make brushing teeth
            <span> story time.</span>
          </h1>

          <p className="hero-description">
            Short narrated stories designed to keep kids engaged while they
            brush from start to finish.
          </p>
        </div>

        <StoryUpload onUploadComplete={() => loadStories(false)} />

        <div className="story-library">
          <div className="section-heading">
            <p className="eyebrow">Story Library</p>

            <h2>Pick a story.</h2>
          </div>

          {loadingStories && <p>Loading stories...</p>}

          {!loadingStories && stories.length === 0 && (
            <p>No stories yet. Upload your first PDF above.</p>
          )}

          {stories.map((story) => {
            const coverImage = story.pages?.[0]?.image;

            return (
              <article className="story-card" key={story.id}>
                <div className="story-cover">
                  {coverImage && (
                    <img src={getAssetUrl(coverImage)} alt={story.title} />
                  )}
                </div>

                <div className="story-card-content">
                  <div>
                    <p className="story-duration">
                      {story.pageCount}{" "}
                      {story.pageCount === 1 ? "page" : "pages"}
                    </p>

                    <h3>{story.title}</h3>

                    <p>Ready for BrushTime playback.</p>
                  </div>

                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => startStory(story)}
                  >
                    Open Story
                  </button>

                  <button
                    className="secondary-button delete-story-button"
                    type="button"
                    onClick={() => handleDeleteStory(story)}
                  >
                    Delete Story
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="site-footer">
        <strong>BrushTime Stories</strong>
        <span>Brush. Listen. Smile.</span>
      </footer>
    </main>
  );
}

export default AdminApp;
