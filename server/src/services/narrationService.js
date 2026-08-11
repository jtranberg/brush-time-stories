/* eslint-disable no-undef */
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function createNarration({
  text,
  outputDirectory,
  pageNumber,
}) {
  if (!text?.trim()) {
    return null;
  }

  const filename =
    `page-${pageNumber}.mp3`;

  const outputPath = path.join(
    outputDirectory,
    filename,
  );

  console.log(
    `Creating narration for page ${pageNumber}...`,
  );

  const response =
    await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "coral",
      input: text,
      instructions:
        "Read this children's story warmly, clearly, and gently. Use an upbeat storytelling pace suitable for a young child brushing their teeth.",
      response_format: "mp3",
    });

  const audioBuffer = Buffer.from(
    await response.arrayBuffer(),
  );

  await fs.writeFile(
    outputPath,
    audioBuffer,
  );

  return filename;
}