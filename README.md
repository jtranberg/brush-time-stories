# BrushTime Stories

BrushTime Stories is a narrated story platform designed to make brushing time more engaging for children.

Parents or publishers can upload a finished PDF story. BrushTime processes each PDF into page images, extracts the page text, and presents the story in a simple narrated reader with automatic page progression.

## Live Application

Frontend:

https://brush-time-stories.netlify.app

Backend API:

https://brush-time-stories.onrender.com

---

## Features

- PDF story upload
- Automatic PDF page rendering
- PDF text extraction
- Story library
- Narrated story playback
- Natural browser-based speech voice
- Title and narration pacing
- Automatic page advancement
- Previous / Next page controls
- Pause and restart controls
- Story progress timer
- Responsive React interface
- Production frontend on Netlify
- Production API on Render

---

## Technology

### Frontend

- React
- Vite
- JavaScript
- CSS
- Web Speech API

### Backend

- Node.js
- Express
- Multer
- PDF.js (`pdfjs-dist`)
- File-based story manifests

### Deployment

- Netlify — frontend
- Render — backend API

---

## Architecture

```text
PDF Upload
    ↓
React Frontend
    ↓
Express Upload API
    ↓
PDF.js
    ├── Render pages to PNG
    └── Extract page text
    ↓
Story Manifest
    ↓
Story Library
    ↓
Web Speech Narration
    ↓
Automatic Page Progression
Local Development
Backend
cd server
npm install
npm run dev

The backend runs by default at:

http://localhost:5050
Frontend

From the project root:

npm install
npm run dev

The frontend normally runs at:

http://localhost:5173
Environment Variables

Create a .env file in the frontend project:

VITE_API_URL=http://localhost:5050

For production, Netlify uses:

VITE_API_URL=https://brush-time-stories.onrender.com

Environment files should not be committed to Git.

Story Processing

When a PDF is uploaded, BrushTime:

Saves the uploaded PDF.
Creates a unique story identifier.
Renders every PDF page into a PNG image.
Extracts text from each page.
Associates the image and narration text.
Generates a story.json manifest.
Adds the story to the story library.
Makes the story available for narrated playback.
Narration

BrushTime uses the browser Web Speech API for narration.

The player:

Removes printed page numbers from narration.
Separates the page title from the body text.
Adds a deliberate pause after the title.
Selects a preferred English system voice when available.
Automatically advances to the next page when narration finishes.

Available voices depend on the user's operating system and browser.

Current Status

BrushTime Stories is in active prototype development.

Current production functionality includes:

PDF upload
PDF-to-image processing
Text extraction
Story library
Narrated playback
Automatic page progression
Production deployment
Planned Improvements
Three-minute story pacing
Duplicate story handling
Story deletion / management
Additional narration controls
Expanded story metadata
Persistent production storage
Publisher / administrator tools
Production Notes

The backend originally used pdf-poppler for PDF image conversion.

That dependency was replaced with PDF.js because pdf-poppler does not support the Linux environment used by Render.

BrushTime now uses a cross-platform PDF rendering pipeline suitable for local Windows development and Linux production deployment.

BrushTime Stories

Brush. Listen. Smile.


That README now actually tells someone **what you built, how it works, why PDF.js is there, how production is wired, and where the project is heading**.

And I’d definitely include **duplicate handling** and **persistent production storage** in Planned Improvements — those six copies of Toby just revealed our next two real product requirements. 😄