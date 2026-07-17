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

/** @param {Blob} blob */
export async function renderPdfPreview(blob) {
  const pdfjsLib = await loadPdfJs();
  const pdfBytes = new Uint8Array(await blob.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;

  try {
    const pages = [];
    let firstText = '';
    

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

      if (!firstText && text) {
        firstText = text;
      }

      pages.push({
        pageNumber,
        dataUrl: canvas.toDataURL('image/png'),
        text,
      });
    }

    return { pages, text: firstText, usedFallback: false };
  } finally {
    await pdf.destroy().catch(() => {});
  }
}
