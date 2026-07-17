import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContractDocumentPreview from '../../src/lib/components/contracts/ContractDocumentPreview.svelte';

const pdfPages = [
  { pageNumber: 1, dataUrl: 'data:image/png;base64,page-1' },
  { pageNumber: 2, dataUrl: 'data:image/png;base64,page-2' },
];

const contractDocument = {
  id: 45,
  documentType: 'documento_pessoal',
  originalFileName: 'documento-pessoal.pdf',
  downloadUrl: '/contracts/45/documents/45/download',
};

describe('ContractDocumentPreview', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
  });

  afterEach(() => {
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  function renderPreview(overrides: Record<string, unknown> = {}) {
    return render(ContractDocumentPreview, {
      open: true,
      title: 'Documento Pessoal',
      fileName: 'documento-pessoal.pdf',
      kind: 'pdf',
      sourceUrl: 'blob:documento-pessoal',
      pdfPages,
      doc: contractDocument,
      ...overrides,
    });
  }

  it('exibe as páginas já renderizadas enquanto o restante do PDF continua carregando', () => {
    renderPreview({ loading: true, pdfPages: [pdfPages[0]] });

    expect(screen.getByTestId('document-preview-viewport')).toBeInTheDocument();
    expect(screen.getByText('Carregando páginas...')).toBeInTheDocument();
    expect(screen.getByAltText('documento-pessoal.pdf - página 1')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument();
  });

  it('navega entre páginas e delega os controles de zoom', async () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onResetZoom = vi.fn();
    const preview = renderPreview({ onZoomIn, onZoomOut, onResetZoom });

    await fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Diminuir zoom' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Aumentar zoom' }));
    await fireEvent.click(screen.getByRole('button', { name: '100%' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Girar documento' }));
    expect(onZoomOut).toHaveBeenCalledTimes(1);
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onResetZoom).toHaveBeenCalledTimes(1);
    await preview.rerender({ zoom: 1.25 });
    expect(screen.getByTestId('document-preview-scaled-content')).toHaveAttribute('data-zoom', '1.25');
    expect(screen.getByTestId('document-preview-scaled-content')).toHaveStyle('width: 1200px');
    expect(screen.getByTestId('document-preview-scaled-content')).toHaveAttribute(
      'data-rotation',
      '90'
    );
    expect(screen.getByAltText('documento-pessoal.pdf - página 1')).toHaveStyle(
      'transform: rotate(90deg)'
    );
  });

  it('mantém paginação e um único controle de saída no modo tela cheia', () => {
    const onToggleFullscreen = vi.fn();
    renderPreview({ isFullscreen: true, onToggleFullscreen });

    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByTestId('document-preview-fullscreen-controls')).toHaveClass('fixed');
    expect(screen.getByTitle('Sair da tela cheia')).toBeInTheDocument();
    expect(screen.queryByTitle('Alternar tela cheia')).not.toBeInTheDocument();
  });

  it('confirma substituir e excluir antes de executar as mutações', async () => {
    const onReplace = vi.fn();
    const onDelete = vi.fn();
    renderPreview({ onReplace, onDelete });

    await fireEvent.click(screen.getByRole('button', { name: 'Substituir documento' }));
    const replaceDialog = screen.getByRole('alertdialog', { name: 'Substituir documento?' });
    expect(replaceDialog).toBeInTheDocument();
    await fireEvent.click(within(replaceDialog).getByRole('button', { name: 'Substituir documento' }));
    expect(onReplace).toHaveBeenCalledTimes(1);

    await fireEvent.click(screen.getByRole('button', { name: 'Excluir documento' }));
    const deleteDialog = screen.getByRole('alertdialog', { name: 'Excluir documento?' });
    await fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Excluir documento' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
