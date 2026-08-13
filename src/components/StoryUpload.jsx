import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

function StoryUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setStatus("Choose a PDF first.");
      return;
    }

    const formData = new FormData();

    formData.append("story", file);

    try {
      setUploading(true);
      setStatus("Uploading story...");

      const response = await fetch(`${API_URL}/api/stories/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed.");
      }

      setStatus(
        `Ready: ${data.story.originalName} — ${data.story.pageCount} pages processed.`,
      );

      setFile(null);

      if (onUploadComplete) {
        await onUploadComplete();
      }
    } catch (error) {
      console.error(error);

      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="upload-panel">
      <div>
        <p className="eyebrow">Publisher</p>

        <h2>Upload a new story.</h2>

        <p>
          Drop in the finished PDF and BrushTime Stories will prepare it for
          playback.
        </p>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="upload-dropzone">
          <span className="upload-title">
            {file ? file.name : "Choose story PDF"}
          </span>

          <span className="upload-help">PDF files up to 100 MB</span>

          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);

              setStatus("");
            }}
          />
        </label>

        <button className="primary-button" type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload Story"}
        </button>

        {status && <p className="upload-status">{status}</p>}
      </form>
    </section>
  );
}

export default StoryUpload;
