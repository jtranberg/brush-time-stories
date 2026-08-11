import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const poppler = require('pdf-poppler')

export async function processPdf({
  pdfPath,
  outputDirectory,
  storyId,
}) {
  await fs.mkdir(outputDirectory, { recursive: true })

  const options = {
    format: 'png',
    out_dir: outputDirectory,
    out_prefix: 'page',
    page: null,
    scale: 1600,
  }

  console.log(`Processing PDF: ${pdfPath}`)
  console.log(`Output directory: ${outputDirectory}`)

  await poppler.convert(pdfPath, options)

  const files = await fs.readdir(outputDirectory)

  const imageFiles = files
  .filter((file) => file.toLowerCase().includes('.png'))
  .sort((a, b) => {
    const aNumber = Number(a.match(/(\d+)$/)?.[1] || 0)
    const bNumber = Number(b.match(/(\d+)$/)?.[1] || 0)

    return aNumber - bNumber
  })

const pages = []

for (let index = 0; index < imageFiles.length; index += 1) {
  const oldFilename = imageFiles[index]
  const newFilename = `page-${index + 1}.png`

  const oldPath = path.join(
    outputDirectory,
    oldFilename
  )

  const newPath = path.join(
    outputDirectory,
    newFilename
  )

  await fs.rename(oldPath, newPath)

  pages.push({
    id: index + 1,
    filename: newFilename,
    image: `/processed/${storyId}/${newFilename}`,
  })
}

  console.log(`Processed ${pages.length} pages.`)

  return {
    storyId,
    pageCount: pages.length,
    pages,
  }
}