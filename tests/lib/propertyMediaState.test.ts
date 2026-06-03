import { describe, expect, it } from 'vitest';
import { reconcilePropertyPreviewMediaState } from '../../src/lib/propertyMediaState';

describe('reconcilePropertyPreviewMediaState', () => {
  it('reseta preview quando a imagem não está aberta', () => {
    const result = reconcilePropertyPreviewMediaState({
      currentSnapshot: [
        { id: 1, url: 'a.jpg' },
        { id: 2, url: 'b.jpg' },
      ],
      currentIndex: 1,
      currentUrl: 'b.jpg',
      nextImages: [
        { id: 1, url: 'a.jpg' },
        { id: 2, url: 'b.jpg' },
        { id: 3, url: 'c.jpg' },
      ],
      isPreviewOpen: false,
    });

    expect(result).toEqual({
      snapshot: [],
      index: 0,
      url: null,
    });
  });

  it('prioriza a imagem focada e mantém o preview sincronizado', () => {
    const result = reconcilePropertyPreviewMediaState({
      currentSnapshot: [
        { id: 1, url: 'a.jpg' },
        { id: 2, url: 'b.jpg' },
      ],
      currentIndex: 0,
      currentUrl: 'a.jpg',
      nextImages: [
        { id: 1, url: 'a.jpg' },
        { id: 2, url: 'b.jpg' },
        { id: 3, url: 'c.jpg' },
      ],
      isPreviewOpen: true,
      focusImageUrl: 'c.jpg',
    });

    expect(result.snapshot).toHaveLength(3);
    expect(result.index).toBe(2);
    expect(result.url).toBe('c.jpg');
  });

  it('usa o índice atual quando não há foco explícito', () => {
    const result = reconcilePropertyPreviewMediaState({
      currentSnapshot: [
        { id: 1, url: 'a.jpg' },
        { id: 2, url: 'b.jpg' },
      ],
      currentIndex: 1,
      currentUrl: 'b.jpg',
      nextImages: [
        { id: 1, url: 'a.jpg' },
        { id: 2, url: 'b.jpg' },
      ],
      isPreviewOpen: true,
    });

    expect(result.index).toBe(1);
    expect(result.url).toBe('b.jpg');
  });
});
