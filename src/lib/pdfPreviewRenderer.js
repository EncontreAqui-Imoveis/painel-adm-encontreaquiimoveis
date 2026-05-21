/** @type {Promise<any> | null} */
let pdfjsPromise = null;

/** @param {HTMLCanvasElement} canvas */
function isLikelyBlankCanvas(canvas) {
  const width = Number(canvas?.width ?? 0);
  const height = Number(canvas?.height ?? 0);
  if (!width || !height) return true;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return true;

  const sampleWidth = Math.min(width, 96);
  const sampleHeight = Math.min(height, 96);
  const sample = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  for (let index = 0; index < sample.length; index += 4) {
    const alpha = sample[index + 3];
    const red = sample[index];
    const green = sample[index + 1];
    const blue = sample[index + 2];
    if (alpha < 240) {
      return false;
    }
    if (red < 245 || green < 245 || blue < 245) {
      return false;
    }
  }

  return true;
}

/** @param {HTMLCanvasElement} canvas @param {string} text */
function drawFallbackText(canvas, text) {
  const context = canvas.getContext('2d');
  if (!context) return;

  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#111827';
  context.font = '600 22px Arial, sans-serif';
  context.textBaseline = 'top';

  const maxWidth = Math.max(240, Math.floor(canvas.width - 64));
  const words = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 28);
  const fallbackText = words.length ? words.join(' ') : 'Visualização do PDF';
  const lines = [];
  let currentLine = '';

  for (const word of fallbackText.split(' ')) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.slice(0, 8).forEach((line, index) => {
    context.fillText(line, 32, 32 + index * 30);
  });
  context.restore();
}

/** @returns {Promise<any>} */
async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/build/pdf.mjs'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjsLib, workerModule]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
      return pdfjsLib;
    });
  }

  return pdfjsPromise;
}

/** @param {Blob} blob */
export async function renderPdfPreview(blob) {
  const pdfjsLib = await loadPdfJs();
  const pdfBytes = new Uint8Array(await blob.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;

  try {
    const pages = [];
    let firstText = '';
    let usedFallback = false;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Não foi possível preparar o canvas do PDF.');
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: context, canvas, viewport }).promise;

      const textContent = await page.getTextContent();
      const textItems = /** @type {Array<{str?: string}>} */ (textContent.items ?? []);
      const text = textItems
        .map((item) => String(item.str ?? ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (isLikelyBlankCanvas(canvas) && text) {
        drawFallbackText(canvas, text);
        usedFallback = true;
      }

      if (!firstText && text) {
        firstText = text;
      }

      pages.push({
        pageNumber,
        dataUrl: canvas.toDataURL('image/png'),
        text,
      });
    }

    return { pages, text: firstText, usedFallback };
  } finally {
    await pdf.destroy().catch(() => {});
  }
}
