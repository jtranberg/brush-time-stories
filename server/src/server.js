/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

import cors from "cors";
import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { processPdf } from "./services/pdfProcessor.js";
import { extractPdfText } from "./services/textExtractor.js";

const app = express();
const PORT = process.env.PORT || 5050;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   DIRECTORIES
   ========================================================= */

const uploadDirectory = path.join(
  __dirname,
  "..",
  "uploads",
);

const processedDirectory = path.join(
  __dirname,
  "..",
  "processed",
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

if (!fs.existsSync(processedDirectory)) {
  fs.mkdirSync(processedDirectory, {
    recursive: true,
  });
}

/* =========================================================
   MIDDLEWARE
   ========================================================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(
          `CORS blocked origin: ${origin}`,
        ),
      );
    },
  }),
);

app.use(express.json());

app.use(
  "/processed",
  express.static(processedDirectory),
);

/* =========================================================
   MULTER STORAGE
   ========================================================= */

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const timestamp = Date.now();

    const safeName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.-]/g, "")
      .toLowerCase();

    callback(
      null,
      `${timestamp}-${safeName}`,
    );
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 25 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    if (
      file.mimetype !== "application/pdf"
    ) {
      return callback(
        new Error(
          "Only PDF files are allowed.",
        ),
      );
    }

    callback(null, true);
  },
});

/* =========================================================
   HEALTH
   ========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service:
      "BrushTime Stories Upload Service",
  });
});

/* =========================================================
   STORY UPLOAD + PDF PROCESSING
   ========================================================= */

app.post(
  "/api/stories/upload",
  upload.single("story"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No PDF was uploaded.",
        });
      }

      const storyId = path
        .parse(req.file.filename)
        .name.replace(
          /[^a-zA-Z0-9-_]/g,
          "-",
        );

      const storyOutputDirectory =
        path.join(
          processedDirectory,
          storyId,
        );

      console.log(
        `Uploaded story: ${req.file.originalname}`,
      );

      console.log(
        `Story ID: ${storyId}`,
      );

      /* -----------------------------------------------------
         CONVERT PDF PAGES TO IMAGES
         ----------------------------------------------------- */

      const processedStory =
        await processPdf({
          pdfPath: req.file.path,
          outputDirectory:
            storyOutputDirectory,
          storyId,
        });

      /* -----------------------------------------------------
         EXTRACT TEXT FROM PDF PAGES
         ----------------------------------------------------- */

      console.log(
        "Extracting story text...",
      );

      const extractedPages =
        await extractPdfText(
          req.file.path,
        );

      console.log(
        `Extracted text from ${extractedPages.length} pages`,
      );

      /* -----------------------------------------------------
         MERGE IMAGE + TEXT DATA
         ----------------------------------------------------- */

      const storyPages =
        processedStory.pages.map(
          (page, index) => ({
            ...page,
            text:
              extractedPages[index]
                ?.text || "",
          }),
        );

      /* -----------------------------------------------------
         DEBUG PAGE TEXT
         ----------------------------------------------------- */

      storyPages.forEach((page) => {
        console.log(
          `Page ${page.id}: ${
            page.text ||
            "[No text found]"
          }`,
        );
      });

      /* -----------------------------------------------------
         BUILD STORY MANIFEST
         ----------------------------------------------------- */

      const storyManifest = {
        id: storyId,

        title: path
          .parse(req.file.originalname)
          .name.replace(
            /[_-]+/g,
            " ",
          ),

        originalName:
          req.file.originalname,

        pageCount:
          processedStory.pageCount,

        pages: storyPages,

        createdAt:
          new Date().toISOString(),
      };

      /* -----------------------------------------------------
         SAVE STORY DATA
         ----------------------------------------------------- */

      fs.writeFileSync(
        path.join(
          storyOutputDirectory,
          "story.json",
        ),
        JSON.stringify(
          storyManifest,
          null,
          2,
        ),
      );

      console.log(
        `Processed ${processedStory.pageCount} pages`,
      );

      /* -----------------------------------------------------
         RESPONSE
         ----------------------------------------------------- */

      return res.status(201).json({
        success: true,
        message:
          "Story uploaded and processed successfully.",
        story: storyManifest,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* =========================================================
   GET STORY LIBRARY
   ========================================================= */

app.get(
  "/api/stories",
  async (req, res, next) => {
    try {
      const entries =
        fs.readdirSync(
          processedDirectory,
          {
            withFileTypes: true,
          },
        );

      const stories = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const manifestPath =
          path.join(
            processedDirectory,
            entry.name,
            "story.json",
          );

        if (
          !fs.existsSync(
            manifestPath,
          )
        ) {
          continue;
        }

        const manifest =
          JSON.parse(
            fs.readFileSync(
              manifestPath,
              "utf8",
            ),
          );

        stories.push(manifest);
      }

      stories.sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt),
      );

      return res.json({
        success: true,
        stories,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* =========================================================
   ERROR HANDLING
   ========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "BrushTime server error:",
      error,
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Story processing failed.",
    });
  },
);

/* =========================================================
   SERVER
   ========================================================= */

app.listen(PORT, () => {
  console.log(
    `BrushTime upload service running on port ${PORT}`,
  );
});