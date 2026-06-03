export interface PropertyMediaImage {
  id: number;
  url: string;
}

export interface PropertyPreviewMediaState {
  snapshot: PropertyMediaImage[];
  index: number;
  url: string | null;
}

export function reconcilePropertyPreviewMediaState(params: {
  currentSnapshot: PropertyMediaImage[];
  currentIndex: number;
  currentUrl: string | null;
  nextImages: PropertyMediaImage[];
  isPreviewOpen: boolean;
  focusImageUrl?: string | null;
}): PropertyPreviewMediaState {
  const {
    currentSnapshot,
    currentIndex,
    currentUrl,
    nextImages,
    isPreviewOpen,
    focusImageUrl = null,
  } = params;

  if (!isPreviewOpen) {
    return {
      snapshot: [],
      index: 0,
      url: null,
    };
  }

  if (nextImages.length === 0) {
    return {
      snapshot: [],
      index: 0,
      url: null,
    };
  }

  const focusIndex = focusImageUrl
    ? nextImages.findIndex((image) => image.url === focusImageUrl)
    : -1;
  const currentUrlIndex =
    currentUrl != null ? nextImages.findIndex((image) => image.url === currentUrl) : -1;
  const resolvedIndex =
    focusIndex >= 0
      ? focusIndex
      : currentUrlIndex >= 0
        ? currentUrlIndex
        : Math.min(Math.max(currentIndex, 0), nextImages.length - 1);

  return {
    snapshot: nextImages.length > 0 ? nextImages : currentSnapshot,
    index: resolvedIndex,
    url: nextImages[resolvedIndex]?.url ?? null,
  };
}
