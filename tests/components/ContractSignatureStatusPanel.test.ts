import { render, screen, within } from '@testing-library/svelte';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import ContractSignatureStatusPanel from '../../src/lib/components/contracts/ContractSignatureStatusPanel.svelte';
import type { ContractItem, ContractSignatureState, ContractSignatureStatus } from '../../src/lib/components/contracts/types';

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
