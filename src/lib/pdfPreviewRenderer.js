/** @type {Promise<any> | null} */
let pdfjsPromise = null;

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

/** @param {AbortSignal | undefined} signal */
function throwIfAborted(signal) {
  if (!signal?.aborted) return;

  const error = new Error('Renderização do PDF cancelada.');
  error.name = 'AbortError';
  throw error;
}

/**
 * @param {Blob} blob
 * @param {{ signal?: AbortSignal, onPage?: (pages: Array<{pageNumber: number, dataUrl: string}>, text: string) => void }} [options]
 */
export async function renderPdfPreview(blob, options = {}) {
  const { signal, onPage } = options;
  throwIfAborted(signal);
  const pdfjsLib = await loadPdfJs();
  throwIfAborted(signal);
  const pdfBytes = new Uint8Array(await blob.arrayBuffer());
  throwIfAborted(signal);
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  let pdf = null;

  try {
    pdf = await loadingTask.promise;
    throwIfAborted(signal);

    const pages = [];
    let firstText = '';

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      throwIfAborted(signal);
      const page = await pdf.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Não foi possível preparar o canvas do PDF.');
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: context, canvas, viewport }).promise;
        throwIfAborted(signal);

        // Text is used for accessibility/search only; avoid parsing every page.
        if (pageNumber === 1) {
          const textContent = await page.getTextContent();
          const textItems = /** @type {Array<{str?: string}>} */ (textContent.items ?? []);
          firstText = textItems
            .map((item) => String(item.str ?? ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }

        pages.push({
          pageNumber,
          dataUrl: canvas.toDataURL('image/png'),
        });
        onPage?.([...pages], firstText);

        // Release the backing bitmap before rendering the next page.
        canvas.width = 0;
        canvas.height = 0;
      } finally {
        page.cleanup?.();
      }
    }

    return { pages, text: firstText, usedFallback: false };
  } finally {
    if (pdf) {
      await pdf.destroy().catch(() => {});
    } else {
      await loadingTask.destroy().catch(() => {});
    }
  }
}
