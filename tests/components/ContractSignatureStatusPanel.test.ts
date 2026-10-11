import { fireEvent, render, screen, within } from '@testing-library/svelte';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import ContractSignatureStatusPanel from '../../src/lib/components/contracts/ContractSignatureStatusPanel.svelte';
import type { ContractItem, ContractSignatureState, ContractSignatureStatus } from '../../src/lib/components/contracts/types';

const viewed = () => ({ contractId: 'contract-1', signedVersionId: 31, documentId: 42, draftRevisionId: 11 });

const timestamp = '2026-10-09T12:34:56.000Z';
const pending = (): ContractSignatureStatus => ({ status: 'PENDING', eventId: null, confirmedByAdminId: null,
  confirmedAt: null, sourceEventId: null, originalEventId: null, originalSignedVersionId: null, preservation: null });
const confirmed = (): ContractSignatureStatus => ({ ...pending(), status: 'CONFIRMED', eventId: 91,
  confirmedByAdminId: 7, confirmedAt: timestamp, originalEventId: 91, originalSignedVersionId: 31 });
const preserved = (): ContractSignatureStatus => ({ ...confirmed(), status: 'PRESERVED', eventId: 101,
  sourceEventId: 99, originalEventId: 91, originalSignedVersionId: 29,
  preservation: { performedByAdminId: 8, performedAt: timestamp, reason: 'Digitalização mais nítida' } });
const signatures = (): ContractSignatureState => ({
  currentVersion: { id: 31, documentId: 42, draftRevisionId: 11, uploadedByAdminId: 8, uploadedAt: timestamp,
    previousVersionId: null, replacementReason: null, equivalence: null }, seller: pending(), buyer: pending(),
});

describe('individual signature controls', () => {
  const current = () => {
    const item = contract(); item.documents![1].downloadUrl = '/negotiations/neg-1/documents/42/download'; return item;
  };
  it.each(['seller', 'buyer'] as const)('requires an explicit declaration for %s and sends the exact version', async (side) => {
    const onConfirmSignature = vi.fn().mockResolvedValue(undefined);
    render(ContractSignatureStatusPanel, { contract: current(), viewingEvidence: viewed(), canConfirm: true, onConfirmSignature });
    const label = side === 'seller' ? 'Locador' : 'Locatário';
    const button = screen.getByRole('button', { name: `Confirmar assinatura (${label})` });
    expect(button).toBeDisabled();
    expect(onConfirmSignature).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('checkbox', { name: `Declaro que conferi a assinatura de ${label} no PDF corrente, versão #31.` }));
    expect(button).toBeEnabled();
    await fireEvent.click(button);
    expect(onConfirmSignature).toHaveBeenCalledExactlyOnceWith(side, 31, true);
    expect(screen.getAllByRole('checkbox').every((element) => !(element as HTMLInputElement).checked)).toBe(true);
  });
  it('opens only the current PDF in the existing viewer callback', async () => {
    const item = current(); const onViewDocument = vi.fn();
    render(ContractSignatureStatusPanel, { contract: item, onViewDocument });
    await fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF corrente' }));
    expect(onViewDocument).toHaveBeenCalledExactlyOnceWith(item.documents![1]);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
  it.each(['contract', 'version', 'document', 'revision', 'cancel'] as const)(
    'clears declarations when viewing evidence is incompatible: %s', async (change) => {
      const item = current(); const proof = viewed();
      const { rerender } = render(ContractSignatureStatusPanel, { contract: item, canConfirm: true, viewingEvidence: proof });
      for (const input of screen.getAllByRole('checkbox')) await fireEvent.click(input);
      expect(screen.getAllByRole('checkbox').every((input) => (input as HTMLInputElement).checked)).toBe(true);
      const next = current();
      if (change === 'contract') next.id = 'another';
      if (change === 'version') next.signatures!.currentVersion!.id = 32;
      if (change === 'document') { next.signatures!.currentVersion!.documentId = 44; next.documents![1].id = 44; }
      if (change === 'revision') next.signatures!.currentVersion!.draftRevisionId = 12;
      await rerender({ contract: next, canConfirm: true, viewingEvidence: change === 'cancel' ? null : proof });
      for (const input of screen.queryAllByRole('checkbox')) { expect(input).not.toBeChecked(); expect(input).toBeDisabled(); }
    },
  );
  it('retains declarations during a normal same-PDF detail refresh', async () => {
    const proof = viewed();
    const { rerender } = render(ContractSignatureStatusPanel, { contract: current(), canConfirm: true, viewingEvidence: proof });
    await fireEvent.click(screen.getAllByRole('checkbox')[1]);
    await rerender({ contract: current(), canConfirm: true, viewingEvidence: proof, loading: true });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await rerender({ contract: current(), canConfirm: true, viewingEvidence: proof, loading: false });
    expect(screen.getAllByRole('checkbox')[1]).toBeChecked();
    expect(screen.getByRole('button', { name: 'Confirmar assinatura (Locatário)' })).toBeEnabled();
  });
  it('does not grant viewing evidence from the open callback or a forced click', async () => {
    const onConfirmSignature = vi.fn(); const onViewDocument = vi.fn();
    render(ContractSignatureStatusPanel, { contract: current(), canConfirm: true, onConfirmSignature, onViewDocument });
    await fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF corrente' }));
    expect(onViewDocument).toHaveBeenCalledOnce();
    for (const input of screen.getAllByRole('checkbox')) expect(input).toBeDisabled();
    const input = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
    input.disabled = false; await fireEvent.click(input);
    const button = screen.getByRole('button', { name: 'Confirmar assinatura (Locador)' }) as HTMLButtonElement;
    button.disabled = false; await fireEvent.click(button);
    expect(onConfirmSignature).not.toHaveBeenCalled();
  });
  it('blocks both sides while an operation is pending and never reconfirms effective signatures', async () => {
    const item = current();
    const { rerender } = render(ContractSignatureStatusPanel, { contract: item, canConfirm: true, confirmingSide: 'seller' });
    for (const input of screen.getAllByRole('checkbox')) expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirmando…' })).toBeDisabled();
    item.signatures!.seller = confirmed(); item.signatures!.buyer = preserved();
    await rerender({ contract: item, canConfirm: true, confirmingSide: null });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
  it('does not allow confirmation of an unavailable document', () => {
    render(ContractSignatureStatusPanel, { contract: contract(), canConfirm: true });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Atualize os detalhes para disponibilizar/)).toHaveLength(2);
  });
  it('provides accessible labels for declarations and actions', async () => {
    const { container } = render(ContractSignatureStatusPanel, { contract: current(), canConfirm: true });
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
  });
});
const contract = (): ContractItem => ({ id: 'contract-1', status: 'AWAITING_SIGNATURES', negotiationId: 'neg-1',
  propertyId: 1, dealType: 'rent', signatures: signatures(), documents: [
    { id: 43, documentType: 'contrato_assinado', originalFileName: 'historico.pdf', metadata: { contractId: 'contract-1' } },
    { id: 42, documentType: 'contrato_assinado', originalFileName: 'corrente.pdf', metadata: { contractId: 'contract-1' } },
  ] });

describe('ContractSignatureStatusPanel (read-only)', () => {
  it('identifies the exact current PDF and approved revision rather than the first historic document', () => {
    render(ContractSignatureStatusPanel, { contract: contract() });
    expect(screen.getByText('PDF corrente: corrente.pdf')).toBeInTheDocument();
    expect(screen.getByText('Versão #31 · Documento #42 · Revisão da minuta #11')).toBeInTheDocument();
    expect(screen.queryByText(/historico.pdf/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Pendente')).toHaveLength(2);
    expect(screen.getByText(/O upload do PDF não confirma/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it.each(['seller', 'buyer', 'both'] as const)('displays only effective direct confirmations: %s', (side) => {
    const item = contract();
    if (side !== 'buyer') item.signatures!.seller = confirmed();
    if (side !== 'seller') item.signatures!.buyer = confirmed();
    render(ContractSignatureStatusPanel, { contract: item });
    expect(screen.getAllByText('Confirmada diretamente')).toHaveLength(side === 'both' ? 2 : 1);
    expect(screen.queryAllByText('Pendente')).toHaveLength(side === 'both' ? 0 : 1);
    expect(screen.getAllByText('Confirmação original: administrador #7')).toHaveLength(side === 'both' ? 2 : 1);
    expect(screen.getAllByText(`Data da confirmação: ${new Date(timestamp).toLocaleString('pt-BR')}`)).toHaveLength(side === 'both' ? 2 : 1);
  });
  it('distinguishes preservation, original author/time, source version and declaration author', () => {
    const item = contract(); item.signatures!.seller = preserved(); item.signatures!.buyer = confirmed();
    item.signatures!.currentVersion!.previousVersionId = 30;
    item.signatures!.currentVersion!.replacementReason = 'Melhoria de digitalização';
    item.signatures!.currentVersion!.equivalence = { declaredByAdminId: 8, declaredAt: timestamp, reason: 'Conteúdo e assinaturas inalterados' };
    render(ContractSignatureStatusPanel, { contract: item });
    expect(screen.getByText('Preservada por equivalência')).toBeInTheDocument();
    expect(screen.getByText('Confirmada diretamente')).toBeInTheDocument();
    expect(screen.getByText('Confirmação originada da versão #29')).toBeInTheDocument();
    expect(screen.getByText('Evento original: #91')).toBeInTheDocument();
    expect(screen.getByText('Evento de origem da preservação: #99')).toBeInTheDocument();
    expect(screen.getByText(/Preservação registrada por administrador #8/)).toBeInTheDocument();
    expect(screen.getByText(/Equivalência declarada por administrador #8/)).toBeInTheDocument();
    expect(screen.getByText('Versão anterior: #30')).toBeInTheDocument();
    expect(screen.getByText(/Conteúdo e assinaturas inalterados/)).toBeInTheDocument();
  });
  it('can display both preserved signatures without calling them direct confirmations', () => {
    const item = contract(); item.signatures!.seller = preserved(); item.signatures!.buyer = preserved();
    render(ContractSignatureStatusPanel, { contract: item });
    expect(screen.getAllByText('Preservada por equivalência')).toHaveLength(2);
    expect(screen.queryByText('Confirmada diretamente')).not.toBeInTheDocument();
  });
  it('does not show confirmations without a current version, even if historical fields are populated', () => {
    const item = contract(); item.signatures!.currentVersion = null; item.signatures!.seller = confirmed();
    render(ContractSignatureStatusPanel, { contract: item });
    expect(screen.getByText(/Nenhum PDF assinado corrente/)).toBeInTheDocument();
    expect(screen.queryByText('Confirmada diretamente')).not.toBeInTheDocument();
  });
  it.each([null, undefined])('handles a legacy with signatures %s as unavailable, not confirmed', (value) => {
    const item = contract(); item.signatures = value;
    render(ContractSignatureStatusPanel, { contract: item });
    expect(screen.getByText(/Dados de assinaturas não disponíveis/)).toBeInTheDocument();
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });
  it.each(['Venda e Aluguel', 'Aluguel'])('uses neutral sides when dealType is absent, regardless of %s', (purpose) => {
    const item = contract(); item.dealType = null; item.propertyPurpose = purpose;
    render(ContractSignatureStatusPanel, { contract: item });
    expect(screen.getByRole('heading', { name: 'Parte seller' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Parte buyer' })).toBeInTheDocument();
    expect(screen.queryByText('Locador')).not.toBeInTheDocument();
    expect(screen.queryByText('Vendedor')).not.toBeInTheDocument();
  });
  it('never labels an unrelated document as current or invents an administrative name', () => {
    const item = contract(); item.documents![1].metadata = { contractId: 'foreign' }; item.signatures!.seller = confirmed();
    render(ContractSignatureStatusPanel, { contract: item });
    expect(screen.getByText('PDF corrente: Documento #42')).toBeInTheDocument();
    expect(screen.getByText(/O documento corrente não está disponível/)).toBeInTheDocument();
    expect(screen.queryByText(/corrente.pdf/)).not.toBeInTheDocument();
    expect(screen.getByText('Confirmação original: administrador #7')).toBeInTheDocument();
  });
  it('does not invent missing author/time or preservation references', () => {
    const item = contract(); item.signatures!.seller = { ...preserved(), confirmedByAdminId: null, confirmedAt: null,
      sourceEventId: null, originalEventId: null, originalSignedVersionId: null, preservation: null };
    render(ContractSignatureStatusPanel, { contract: item });
    expect(screen.getByText('Preservada por equivalência')).toBeInTheDocument();
    expect(screen.queryByText(/Confirmação original:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Data da confirmação:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Evento original:/)).not.toBeInTheDocument();
  });
  it('hides old confirmations during loading or error and remains accessible', async () => {
    const item = contract(); item.signatures!.seller = confirmed();
    const { rerender, container } = render(ContractSignatureStatusPanel, { contract: item, loading: true });
    expect(screen.getByRole('region', { name: 'Assinaturas presenciais' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    expect(screen.queryByText('Confirmada diretamente')).not.toBeInTheDocument();
    await rerender({ contract: item, loading: false, error: true });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível consultar');
    expect(screen.queryByText('Confirmada diretamente')).not.toBeInTheDocument();
    await rerender({ contract: item, loading: false, error: false });
    expect(within(screen.getByRole('region', { name: 'Assinaturas presenciais' })).getByText('Confirmada diretamente')).toBeInTheDocument();
    expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
  });
});
