import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContractDraftUploadPanel from '../../src/lib/components/contracts/ContractDraftUploadPanel.svelte';
import type { ContractItem } from '../../src/lib/components/contracts/types';

describe('ContractDraftUploadPanel reason overflow', () => {
  let measurements: Map<string, { scroll: number; client: number }>;
  let observers: Array<{ node?: Element; callback: () => void; disconnect: ReturnType<typeof vi.fn> }>;

  function contract(reason: string): ContractItem {
    return {
      id: 'contract-1', negotiationId: 'neg-1', propertyId: 1,
      status: 'AWAITING_MINUTE_REVIEW',
      draftReview: { sellerChangeRequest: { id: 11, reviewerSide: 'seller', reason, pendingResolution: true } },
    };
  }

  beforeEach(() => {
    measurements = new Map();
    observers = [];
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function () {
      return measurements.get(this.textContent ?? '')?.scroll ?? 32;
    });
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function () {
      return measurements.get(this.textContent ?? '')?.client ?? 32;
    });
    vi.stubGlobal('ResizeObserver', class {
      node?: Element;
      callback: () => void;
      disconnect = vi.fn();
      constructor(callback: () => void) { this.callback = callback; observers.push(this); }
      observe(node: Element) { this.node = node; }
      unobserve() {}
    });
  });

  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it.each(['Motivo curto', 'x'.repeat(5000)])('does not show a detail button when the rendered text fits', async (reason) => {
    render(ContractDraftUploadPanel, { contract: contract(reason) });
    await waitFor(() => expect(observers.some((observer) => observer.node?.textContent === reason)).toBe(true));
    expect(screen.queryByRole('button', { name: 'Ver motivo completo' })).not.toBeInTheDocument();
  });

  it.each(['texto <b>literal</b>\n' + 'x'.repeat(4979), 'linha\n'.repeat(30)])(
    'shows overflowing text literally and integrally in the scrollable preview and dialog', async (reason) => {
      measurements.set(reason, { scroll: 512, client: 128 });
      render(ContractDraftUploadPanel, { contract: contract(reason) });
      const button = await screen.findByRole('button', { name: 'Ver motivo completo' });
      const preview = screen.getByText((_, node) => node?.textContent === reason);
      expect(preview).toHaveClass('max-h-32', 'overflow-y-auto', 'whitespace-pre-wrap', 'break-words');
      expect(preview).not.toHaveClass('line-clamp-3');
      await fireEvent.click(button);
      expect(screen.getByRole('heading', { name: 'Motivo da solicitação de correção' })).toBeInTheDocument();
      expect(screen.getAllByText((_, node) => node?.textContent === reason)).toHaveLength(2);
      expect(screen.queryByText('literal', { selector: 'b' })).not.toBeInTheDocument();
      const dialogText = screen.getAllByText((_, node) => node?.textContent === reason)[1];
      expect(dialogText).toHaveClass('overflow-y-auto', 'whitespace-pre-wrap', 'break-words');
    }
  );

  it('remeasures on resize in both directions and disconnects when destroyed', async () => {
    const reason = 'Mesmo texto em larguras diferentes';
    const { unmount } = render(ContractDraftUploadPanel, { contract: contract(reason) });
    await waitFor(() => expect(observers.some((observer) => observer.node?.textContent === reason)).toBe(true));
    const observer = observers.find((entry) => entry.node?.textContent === reason)!;
    measurements.set(reason, { scroll: 256, client: 128 });
    observer.callback();
    await screen.findByRole('button', { name: 'Ver motivo completo' });
    measurements.set(reason, { scroll: 64, client: 64 });
    observer.callback();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Ver motivo completo' })).not.toBeInTheDocument());
    unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it('remeasures when the reason changes without needing a resize', async () => {
    const { rerender } = render(ContractDraftUploadPanel, { contract: contract('Curto') });
    const nextReason = 'Texto atualizado\ncom mais linhas';
    measurements.set(nextReason, { scroll: 256, client: 128 });
    await rerender({ contract: contract(nextReason) });
    await screen.findByRole('button', { name: 'Ver motivo completo' });
    await rerender({ contract: contract('Curto novamente') });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Ver motivo completo' })).not.toBeInTheDocument());
  });

  it('keeps pending, resolved-request and administrative-response measurements independent', async () => {
    const value = contract('Pedido curto');
    const originalReason = 'Pedido resolvido\ncom muitas linhas';
    const adminReason = 'Resposta <script>literal</script>\n' + 'a'.repeat(4967);
    value.draftReview!.buyerChangeRequest = {
      id: 12, reviewerSide: 'buyer', reason: originalReason, pendingResolution: false,
      resolution: { id: 21, resolution: 'KEPT_CURRENT_DRAFT', reason: adminReason },
    };
    measurements.set(originalReason, { scroll: 400, client: 160 });
    const { rerender } = render(ContractDraftUploadPanel, { contract: value });
    const resolvedSection = screen.getByText('Solicitação analisada').closest('section')!;
    await waitFor(() => expect(within(resolvedSection).getAllByRole('button', { name: 'Ver motivo completo' })).toHaveLength(1));
    expect(within(screen.getByText('Correção solicitada').closest('section')!).queryByRole('button', { name: 'Ver motivo completo' })).not.toBeInTheDocument();
    measurements.set(adminReason, { scroll: 700, client: 160 });
    observers.find((entry) => entry.node?.textContent === adminReason)!.callback();
    await waitFor(() => expect(within(resolvedSection).getAllByRole('button', { name: 'Ver motivo completo' })).toHaveLength(2));
    await fireEvent.click(within(resolvedSection).getAllByRole('button', { name: 'Ver motivo completo' })[1]);
    expect(screen.getByRole('heading', { name: 'Resposta da imobiliária' })).toBeInTheDocument();
    expect(screen.getAllByText((_, node) => node?.textContent === adminReason)).toHaveLength(2);
    expect(document.querySelector('script')).toBeNull();
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar' }));
    await rerender({ contract: contract('Novo pedido curto') });
    expect(screen.queryByRole('button', { name: 'Ver motivo completo' })).not.toBeInTheDocument();
  });
});
