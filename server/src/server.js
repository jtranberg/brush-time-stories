/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import { processPdf } from "./services/pdfProcessor.js";
import { extractPdfText } from "./services/textExtractor.js";
import Story from "./models/Story.js";

import {
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { r2, R2_BUCKET_NAME } from "./services/r2Client.js";

const app = express();
const PORT = process.env.PORT || 5050;

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI");
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   DIRECTORIES
   ========================================================= */

const uploadDirectory = path.join(__dirname, "..", "uploads");

const processedDirectory = path.join(__dirname, "..", "processed");

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
  "https://brush-time-stories.netlify.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
  }),
);

app.use(express.json());

app.use("/processed", express.static(processedDirectory));

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

    callback(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 100 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      return callback(new Error("Only PDF files are allowed."));
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
    service: "BrushTime Stories Upload Service",
  });
});

app.get("/api/r2-test", async (req, res, next) => {
  try {
    const result = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
      }),
    );

    return res.json({
      success: true,
      bucket: R2_BUCKET_NAME,
      objectCount: result.KeyCount ?? 0,
      objects: result.Contents ?? [],
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/mongo-test", async (req, res, next) => {
  try {
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB database connection is not ready.");
    }

    const collection = db.collection("connection-tests");

    const testDocument = {
      message: "BrushTime MongoDB test successful.",
      createdAt: new Date(),
    };

    const insertResult = await collection.insertOne(testDocument);

    const savedDocument = await collection.findOne({
      _id: insertResult.insertedId,
    });

    return res.json({
      success: true,
      message: "MongoDB write/read test successful.",
      document: savedDocument,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/r2-write-test", async (req, res, next) => {
  try {
    const key = `tests/brushtime-test-${Date.now()}.txt`;

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: "BrushTime R2 write test successful.",
        ContentType: "text/plain",
      }),
    );

    return res.json({
      success: true,
      message: "Test file written to R2.",
      key,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/r2-delete-test", async (req, res, next) => {
  try {
    const key = "tests/brushtime-test-1786514851493.txt";

    await r2.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      }),
    );

    return res.json({
      success: true,
      message: "Test file deleted from R2.",
      key,
    });
  } catch (error) {
    next(error);
  }
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
        .name.replace(/[^a-zA-Z0-9-_]/g, "-");

      const storyOutputDirectory = path.join(processedDirectory, storyId);

      console.log(`Uploaded story: ${req.file.originalname}`);

      console.log(`Story ID: ${storyId}`);

      /* -----------------------------------------------------
         CONVERT PDF PAGES TO IMAGES
         ----------------------------------------------------- */

      const processedStory = await processPdf({
        pdfPath: req.file.path,
        outputDirectory: storyOutputDirectory,
        storyId,
      });

      /* -----------------------------------------------------
         EXTRACT TEXT FROM PDF PAGES
         ----------------------------------------------------- */

      console.log("Extracting story text...");

      const extractedPages = await extractPdfText(req.file.path);

      console.log(`Extracted text from ${extractedPages.length} pages`);

      /* -----------------------------------------------------
         MERGE IMAGE + TEXT DATA
         ----------------------------------------------------- */

      const storyPages = processedStory.pages.map((page, index) => ({
        ...page,
        text: extractedPages[index]?.text || "",
      }));

      /* -----------------------------------------------------
   UPLOAD STORY PAGE IMAGES TO R2
   ----------------------------------------------------- */

  

      for (const page of storyPages) {
        const localImagePath = path.join(
          storyOutputDirectory,
          path.basename(page.image),
        );

        const r2Key = `stories/${storyId}/pages/${path.basename(page.image)}`;

        const imageBuffer = fs.readFileSync(localImagePath);

        await r2.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Key,
            Body: imageBuffer,
            ContentType: "image/png",
          }),
        );

        page.r2Key = r2Key;

        console.log(`Uploaded page to R2: ${r2Key}`);
      }

      /* -----------------------------------------------------
         DEBUG PAGE TEXT
         ----------------------------------------------------- */

      storyPages.forEach((page) => {
        console.log(`Page ${page.id}: ${page.text || "[No text found]"}`);
      });

      /* -----------------------------------------------------
         BUILD STORY MANIFEST
         ----------------------------------------------------- */

      const storyManifest = {
        id: storyId,

        title: path.parse(req.file.originalname).name.replace(/[_-]+/g, " "),

        originalName: req.file.originalname,

        pageCount: processedStory.pageCount,

        pages: storyPages,

        createdAt: new Date().toISOString(),
      };

      /* -----------------------------------------------------
         SAVE STORY DATA
         ----------------------------------------------------- */

      fs.writeFileSync(
        path.join(storyOutputDirectory, "story.json"),
        JSON.stringify(storyManifest, null, 2),
      );

      console.log(`Processed ${processedStory.pageCount} pages`);

      /* -----------------------------------------------------
   SAVE STORY TO MONGODB
   ----------------------------------------------------- */

      const mongoStory = await Story.create({
        storyId: storyManifest.id,
        title: storyManifest.title,
        originalName: storyManifest.originalName,
        pageCount: storyManifest.pageCount,
        pages: storyManifest.pages,
        createdAt: storyManifest.createdAt,
        status: "draft",
      });

      console.log(`Story saved to MongoDB: ${mongoStory.storyId}`);

      /* -----------------------------------------------------
         RESPONSE
         ----------------------------------------------------- */

      return res.status(201).json({
        success: true,
        message: "Story uploaded and processed successfully.",
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
        "/api/stories/:storyId/pages/:pageId/image",
        async (req, res, next) => {
          try {
            const { storyId, pageId } = req.params;

            const story = await Story.findOne({
              storyId,
            }).lean();

            if (!story) {
              return res.status(404).json({
                success: false,
                message: "Story not found.",
              });
            }

            const page = story.pages.find(
              (item) => String(item.id) === String(pageId),
            );

            if (!page) {
              return res.status(404).json({
                success: false,
                message: "Story page not found.",
              });
            }

            if (!page.r2Key) {
              return res.status(404).json({
                success: false,
                message: "R2 image key is missing for this page.",
              });
            }

            const result = await r2.send(
              new GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: page.r2Key,
              }),
            );

            res.setHeader("Content-Type", result.ContentType || "image/png");

            res.setHeader("Cache-Control", "public, max-age=3600");

            result.Body.pipe(res);
          } catch (error) {
            next(error);
          }
        },
      );

app.get("/api/stories", async (req, res, next) => {
  try {
    const stories = await Story.find({})
      .sort({ createdAt: -1 })
      .lean();

    const normalizedStories = stories.map((story) => ({
      ...story,
      id: story.storyId,

      pages: story.pages.map((page) => ({
        ...page,
        image: `/api/stories/${story.storyId}/pages/${page.id}/image`,
      })),
    }));

    return res.json({
      success: true,
      stories: normalizedStories,
    });
  } catch (error) {
    next(error);
  }
});
/* =========================================================
   ERROR HANDLING
   ========================================================= */

app.use((error, req, res, next) => {
  console.error("BrushTime server error:", error);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message || "Story processing failed.",
  });
});

/* =========================================================
   SERVER
   ========================================================= */

app.listen(PORT, () => {
  console.log(`BrushTime upload service running on port ${PORT}`);
});
