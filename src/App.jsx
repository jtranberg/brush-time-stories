import { useCallback, useEffect, useRef, useState } from "react";
import StoryUpload from "./components/StoryUpload";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5050";

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
   APP
   ========================================================= */

function App() {
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

  useEffect(() => {
  const loadVoices = () => {
    voicesRef.current =
      window.speechSynthesis.getVoices();
  };

  loadVoices();

  window.speechSynthesis.addEventListener(
    "voiceschanged",
    loadVoices,
  );

  return () => {
    window.speechSynthesis.removeEventListener(
      "voiceschanged",
      loadVoices,
    );
  };
}, []);

  /*
   * Initial story load.
   *
   * We intentionally perform the fetch asynchronously here
   * instead of immediately calling loadStories(), avoiding the
   * React set-state-in-effect lint warning.
   */
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
      /female|samantha|zira|aria|jenny|ava/i.test(
        voice.name,
      ),
  ) ||
  voicesRef.current.find((voice) =>
    voice.lang.startsWith("en"),
  ) ||
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
     STORY PLAYER
     ========================================================= */

  if (selectedStory && currentPage) {
    const progress = Math.min((elapsedSeconds / storyDuration) * 100, 100);

    const hasNarration = Boolean(currentPage.text?.trim());

    return (
      <main className="app-shell">
        <section className="player">
          <button className="back-button" type="button" onClick={handleBack}>
            ← Back to Stories
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
     STORY LIBRARY
     ========================================================= */

  return (
    <main className="app-shell">
      <section className="hero-section">
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

export default App;
