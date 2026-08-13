import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./StoryPlayer.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5050";

/* =========================================================
   HELPERS
   ========================================================= */

function formatTime(seconds = 0) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function getStoryImageUrl(
  storyId,
  pageNumber,
) {
  return `${API_URL}/api/stories/${storyId}/pages/${pageNumber}/image`;
}

/* =========================================================
   STORY PLAYER
   ========================================================= */

function StoryPlayer() {
  const [story, setStory] = useState(null);
  const [loading, setLoading] =
    useState(true);

  const [
    currentPageIndex,
    setCurrentPageIndex,
  ] = useState(0);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const timerRef = useRef(null);
  const voicesRef = useRef([]);

  const storyId =
    window.location.pathname
      .split("/story/")[1];

  const currentPage =
    story?.pages?.[currentPageIndex] ||
    null;

  const storyDuration =
    story?.durationSeconds || 180;

  /* =========================================================
     LOAD STORY
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/api/stories`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Unable to load story.",
          );
        }

        return response.json();
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        const foundStory =
          data.stories?.find(
            (item) =>
              item.id === storyId,
          );

        setStory(foundStory || null);
      })
      .catch((error) => {
        console.error(
          "Unable to load story:",
          error,
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  /* =========================================================
     LOAD BROWSER VOICES
     ========================================================= */

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

      window.speechSynthesis.cancel();
    };
  }, []);

  /* =========================================================
     TIMER
     ========================================================= */

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        clearInterval(
          timerRef.current,
        );

        timerRef.current = null;
      }

      return undefined;
    }

    timerRef.current = setInterval(
      () => {
        setElapsedSeconds(
          (current) => current + 1,
        );
      },
      1000,
    );

    return () => {
      if (timerRef.current) {
        clearInterval(
          timerRef.current,
        );

        timerRef.current = null;
      }
    };
  }, [isPlaying]);

  /* =========================================================
     NARRATION
     ========================================================= */

  function speakPage(pageIndex) {
    if (!story) {
      return;
    }

    const page =
      story.pages?.[pageIndex];

    if (!page?.text?.trim()) {
      setIsPlaying(false);
      return;
    }

    /*
     * Our extracted PDF text commonly looks like:
     *
     * "The Brave Little Toothbrush Page 1 Every morning..."
     *
     * Split around "Page N" so the page number itself
     * is not narrated.
     */
    const pageParts =
      page.text.match(
        /^(.*?)\bpage\s+\d+\b(.*)$/is,
      );

    let title = "";
    let body = "";

    if (pageParts) {
      title =
        pageParts[1].trim();

      body =
        pageParts[2].trim();
    } else {
      body =
        page.text.trim();
    }

    const preferredVoice =
      voicesRef.current.find(
        (voice) =>
          voice.lang.startsWith("en") &&
          /female|samantha|zira|aria|jenny|ava/i.test(
            voice.name,
          ),
      ) ||
      voicesRef.current.find(
        (voice) =>
          voice.lang.startsWith("en"),
      ) ||
      null;

    const finishPage = () => {
      const nextPageIndex =
        pageIndex + 1;

      if (
        nextPageIndex >=
        story.pages.length
      ) {
        setIsPlaying(false);
        return;
      }

      setCurrentPageIndex(
        nextPageIndex,
      );

      setTimeout(() => {
        speakPage(nextPageIndex);
      }, 300);
    };

    const speakBody = () => {
      if (!body) {
        finishPage();
        return;
      }

      const bodyUtterance =
        new SpeechSynthesisUtterance(
          body,
        );

      if (preferredVoice) {
        bodyUtterance.voice =
          preferredVoice;
      }

      bodyUtterance.rate = 0.9;
      bodyUtterance.pitch = 1.05;
      bodyUtterance.volume = 1;

      bodyUtterance.onend =
        finishPage;

      bodyUtterance.onerror =
        (event) => {
          console.error(
            "Narration error:",
            event,
          );

          setIsPlaying(false);
        };

      window.speechSynthesis.speak(
        bodyUtterance,
      );
    };

    /*
     * If the page has a title,
     * narrate it first and pause
     * before reading the body.
     */
    if (title) {
      const titleUtterance =
        new SpeechSynthesisUtterance(
          title,
        );

      if (preferredVoice) {
        titleUtterance.voice =
          preferredVoice;
      }

      titleUtterance.rate = 0.9;
      titleUtterance.pitch = 1.05;
      titleUtterance.volume = 1;

      titleUtterance.onend =
        () => {
          setTimeout(() => {
            speakBody();
          }, 700);
        };

      titleUtterance.onerror =
        (event) => {
          console.error(
            "Narration error:",
            event,
          );

          setIsPlaying(false);
        };

      setIsPlaying(true);

      window.speechSynthesis.speak(
        titleUtterance,
      );

      return;
    }

    setIsPlaying(true);
    speakBody();
  }

  /* =========================================================
     CONTROLS
     ========================================================= */

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

    setCurrentPageIndex(
      (current) => current - 1,
    );
  }

  function handleNextPage() {
    if (!story) {
      return;
    }

    if (
      currentPageIndex >=
      story.pages.length - 1
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    setIsPlaying(false);

    setCurrentPageIndex(
      (current) => current + 1,
    );
  }

  function handleRestart() {
    window.speechSynthesis.cancel();

    setCurrentPageIndex(0);
    setElapsedSeconds(0);
    setIsPlaying(false);
  }

  /* =========================================================
     LOADING / ERROR
     ========================================================= */

  if (loading) {
    return (
      <main className="story-player-shell">
        <div className="story-player-status">
          <h1>Getting story time ready...</h1>

          <p>
            Your adventure is loading.
          </p>
        </div>
      </main>
    );
  }

  if (!story || !currentPage) {
    return (
      <main className="story-player-shell">
        <div className="story-player-status">
          <h1>Story not found.</h1>

          <p>
            This BrushTime story is not
            available.
          </p>
        </div>
      </main>
    );
  }

  /* =========================================================
     PLAYER VIEW
     ========================================================= */

  const progress = Math.min(
    (elapsedSeconds /
      storyDuration) *
      100,
    100,
  );

  const hasNarration =
    Boolean(
      currentPage.text?.trim(),
    );

  return (
    <main className="story-player-shell">
      <div className="story-player-wrap">
        <a
          className="story-player-back"
          href="/"
        >
          ← Back to Stories
        </a>

        <section className="story-player-card">
          <div className="story-player-image-wrap">
            <img
              className="story-player-image"
              src={getStoryImageUrl(
                story.id,
                currentPage.id,
              )}
              alt={`${story.title} - Page ${
                currentPageIndex + 1
              }`}
            />
          </div>

          <div className="story-player-content">
            <p className="story-player-eyebrow">
              BrushTime Stories
            </p>

            <h1 className="story-player-title">
              {story.title}
            </h1>

            <p className="story-player-page-count">
              Page{" "}
              {currentPageIndex + 1} of{" "}
              {story.pages.length}
            </p>

            <div className="story-player-progress">
              <div className="story-player-track">
                <div
                  className="story-player-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className="story-player-times">
                <span>
                  {formatTime(
                    elapsedSeconds,
                  )}
                </span>

                <span>
                  {formatTime(
                    storyDuration,
                  )}
                </span>
              </div>
            </div>

            <div className="story-player-controls">
              <button
                className="story-player-button story-player-button-secondary"
                type="button"
                onClick={
                  handlePreviousPage
                }
                disabled={
                  currentPageIndex === 0
                }
              >
                Previous
              </button>

              {hasNarration &&
                (!isPlaying ? (
                  <button
                    className="story-player-button story-player-button-primary"
                    type="button"
                    onClick={
                      handlePlay
                    }
                  >
                    ▶ Play
                  </button>
                ) : (
                  <button
                    className="story-player-button story-player-button-primary"
                    type="button"
                    onClick={
                      handlePause
                    }
                  >
                    Pause
                  </button>
                ))}

              <button
                className="story-player-button story-player-button-secondary"
                type="button"
                onClick={
                  handleNextPage
                }
                disabled={
                  currentPageIndex ===
                  story.pages.length - 1
                }
              >
                Next
              </button>

              <button
                className="story-player-button story-player-button-secondary"
                type="button"
                onClick={
                  handleRestart
                }
              >
                Restart
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default StoryPlayer;