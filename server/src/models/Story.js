import mongoose from "mongoose";

const storyPageSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
    },

    image: {
      type: String,
      required: true,
    },

    r2Key: {
      type: String,
      default: "",
    },

    text: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const storySchema = new mongoose.Schema(
  {
    storyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    pageCount: {
      type: Number,
      required: true,
    },

    pages: {
      type: [storyPageSchema],
      default: [],
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "published",
        "archived",
      ],
      default: "draft",
    },
  },
  {
    timestamps: true,
  },
);

const Story = mongoose.model(
  "Story",
  storySchema,
);

export default Story;