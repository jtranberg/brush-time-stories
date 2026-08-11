import fs from "node:fs/promises";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function processPdf({
  pdfPath,
  outputDirectory,
  storyId,
}) {
  await fs.mkdir(outputDirectory, {
    recursive: true,
  });

  console.log(`Processing PDF: ${pdfPath}`);
  console.log(
    `Output directory: ${outputDirectory}`,
  );

  /* =========================================================
     LOAD PDF
     ========================================================= */

  const pdfBuffer = await fs.readFile(pdfPath);

  const loadingTask = getDocument({
    data: new Uint8Array(pdfBuffer),
  });

  const pdfDocument =
    await loadingTask.promise;

  console.log(
    `PDF loaded: ${pdfDocument.numPages} pages`,
  );

  const pages = [];

  /* =========================================================
     RENDER EACH PAGE
     ========================================================= */

  for (
    let pageNumber = 1;
    pageNumber <= pdfDocument.numPages;
    pageNumber += 1
  ) {
    console.log(
      `Rendering page ${pageNumber} of ${pdfDocument.numPages}`,
    );

    const page =
      await pdfDocument.getPage(pageNumber);

    /*
     * Render at approximately the same quality level
     * we were targeting with pdf-poppler.
     */
    const baseViewport =
      page.getViewport({
        scale: 1,
      });

    const targetWidth = 1600;

    const scale =
      targetWidth / baseViewport.width;

    const viewport =
      page.getViewport({
        scale,
      });

    const canvasFactory =
      pdfDocument.canvasFactory;

    const canvasAndContext =
      canvasFactory.create(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );

    const renderTask = page.render({
      canvasContext:
        canvasAndContext.context,
      viewport,
    });

    await renderTask.promise;

    /* -----------------------------------------------------
       SAVE PNG
       ----------------------------------------------------- */

    const filename =
      `page-${pageNumber}.png`;

    const outputPath =
      `${outputDirectory}/${filename}`;

    const imageBuffer =
      canvasAndContext.canvas.toBuffer(
        "image/png",
      );

    await fs.writeFile(
      outputPath,
      imageBuffer,
    );

    pages.push({
      id: pageNumber,
      filename,
      image:
        `/processed/${storyId}/${filename}`,
    });

    /*
     * Release resources used for this page before
     * continuing to the next one.
     */
    page.cleanup();

    canvasFactory.destroy(
      canvasAndContext,
    );
  }

  /* =========================================================
     CLEAN UP PDF
     ========================================================= */

  await loadingTask.destroy();

  console.log(
    `Processed ${pages.length} pages.`,
  );

  return {
    storyId,
    pageCount: pages.length,
    pages,
  };
}