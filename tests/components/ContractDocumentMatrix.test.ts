import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import ContractDocumentMatrix from '../../src/lib/components/contracts/ContractDocumentMatrix.svelte';

describe('ContractDocumentMatrix', () => {
  it('não marca Outro vazio como pendente e mantém o envio disponível', () => {
    render(ContractDocumentMatrix, {
      rows: [{ documentType: 'outro', sellerRequired: true, buyerRequired: false, sellerDocs: [], buyerDocs: [] }],
      documentLabel: () => 'Outro',
    });

    expect(screen.getByText('Outro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('mostra o status real quando Outro possui arquivo pendente', () => {
    render(ContractDocumentMatrix, {
      rows: [{
        documentType: 'outro', sellerRequired: true, buyerRequired: false,
        sellerDocs: [{ id: 71, documentType: 'cliente_outro_01', side: 'seller', status: 'PENDING', originalFileName: 'anexo.pdf' }], buyerDocs: [],
      }],
      documentLabel: () => 'Outro',
      documentFileName: () => 'anexo.pdf',
      documentStatusLabel: () => 'Em análise',
      documentStatusClass: () => 'bg-amber-100',
    });

    expect(screen.getByText('Em análise')).toBeInTheDocument();
  });

  it('mantém Pendente em documento obrigatório vazio', () => {
    render(ContractDocumentMatrix, {
      rows: [{ documentType: 'doc_identidade', sellerRequired: true, buyerRequired: false, sellerDocs: [], buyerDocs: [] }],
      documentLabel: () => 'Documento Pessoal',
    });

    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('trata aprovação com ressalvas como documento bloqueado', () => {
    render(ContractDocumentMatrix, {
      rows: [
        {
          documentType: 'doc_identidade',
          sellerRequired: true,
          buyerRequired: false,
          sellerDocs: [
            {
              id: 42,
              documentType: 'doc_identidade',
              side: 'seller',
              status: 'APPROVED_WITH_RES',
              originalFileName: 'identidade-com-ressalvas.pdf',
            },
          ],
          buyerDocs: [],
        },
      ],
      documentLabel: () => 'Documento Pessoal',
      documentFileName: (doc: { originalFileName?: string | null }) =>
        doc.originalFileName ?? 'Documento',
      documentStatusLabel: () => 'Aprovado com ressalvas',
      documentStatusClass: () => 'bg-amber-100 text-amber-800',
      onDownload: vi.fn(),
    });

    const documentCard = screen
      .getByRole('button', { name: 'identidade-com-ressalvas.pdf' })
      .parentElement?.parentElement;

    expect(documentCard).not.toBeNull();
    const card = within(documentCard as HTMLElement);
    expect(card.getByLabelText('Baixar documento aprovado')).toBeInTheDocument();
    expect(card.getByLabelText('Reabrir análise')).toHaveAttribute('title', 'Reabrir análise');
    expect(card.queryByLabelText('Editar documento')).not.toBeInTheDocument();
    expect(card.queryByLabelText('Aprovar documento')).not.toBeInTheDocument();
    expect(card.queryByLabelText('Rejeitar documento')).not.toBeInTheDocument();
  });

  it('mostra reabertura apenas para documento aprovado', async () => {
    const reopen = vi.fn();
    render(ContractDocumentMatrix, {
      rows: [{ documentType: 'doc_identidade', sellerRequired: true, buyerRequired: false,
        sellerDocs: [{ id: 9, documentType: 'doc_identidade', side: 'seller', status: 'APPROVED', originalFileName: 'id.pdf' }], buyerDocs: [] }],
      documentLabel: () => 'Documento Pessoal', documentFileName: () => 'id.pdf', onReopen: reopen,
    });
    await fireEvent.click(screen.getByLabelText('Reabrir análise'));
    expect(reopen).toHaveBeenCalledTimes(1);
  });

  it('deixa lado aprovado somente para leitura sem afetar o outro lado', () => {
    render(ContractDocumentMatrix, {
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'APPROVED', buyerApprovalStatus: 'PENDING',
      },
      rows: [{
        documentType: 'doc_identidade', sellerRequired: true, buyerRequired: true,
        sellerDocs: [{ id: 1, documentType: 'doc_identidade', side: 'seller', status: 'APPROVED', originalFileName: 'seller.pdf' }],
        buyerDocs: [{ id: 2, documentType: 'doc_identidade', side: 'buyer', status: 'PENDING', originalFileName: 'buyer.pdf' }],
      }],
      documentLabel: () => 'Documento Pessoal',
      documentFileName: (doc: { originalFileName?: string | null }) => doc.originalFileName ?? 'Documento',
    });

    const sellerCard = screen.getByRole('button', { name: 'seller.pdf' }).parentElement?.parentElement;
    expect(sellerCard).not.toBeNull();
    expect(within(sellerCard as HTMLElement).getByLabelText('Baixar documento aprovado')).toBeInTheDocument();
    expect(within(sellerCard as HTMLElement).queryByLabelText('Reabrir análise')).not.toBeInTheDocument();
    expect(within(sellerCard as HTMLElement).queryByLabelText('Aprovar documento')).not.toBeInTheDocument();

    const buyerCard = screen.getByRole('button', { name: 'buyer.pdf' }).parentElement?.parentElement;
    expect(buyerCard).not.toBeNull();
    expect(within(buyerCard as HTMLElement).getByLabelText('Editar documento')).toBeInTheDocument();
    expect(within(buyerCard as HTMLElement).getByLabelText('Aprovar documento')).toBeInTheDocument();
  });

  it('mantém o lado rejeitado somente para leitura e não oferece upload em slot vazio', () => {
    const view = render(ContractDocumentMatrix, {
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'REJECTED', buyerApprovalStatus: 'PENDING',
      },
      rows: [{
        documentType: 'doc_identidade', sellerRequired: true, buyerRequired: true,
        sellerDocs: [{ id: 1, documentType: 'doc_identidade', side: 'seller', status: 'PENDING', originalFileName: 'seller.pdf' }],
        buyerDocs: [{ id: 2, documentType: 'doc_identidade', side: 'buyer', status: 'PENDING', originalFileName: 'buyer.pdf' }],
      }, {
        documentType: 'comprovante_renda', sellerRequired: true, buyerRequired: false,
        sellerDocs: [], buyerDocs: [],
      }],
      documentLabel: () => 'Documento Pessoal',
      documentFileName: (doc: { originalFileName?: string | null }) => doc.originalFileName ?? 'Documento',
    });

    const sellerCard = screen.getByRole('button', { name: 'seller.pdf' }).parentElement?.parentElement;
    expect(within(sellerCard as HTMLElement).queryByLabelText('Editar documento')).not.toBeInTheDocument();
    expect(within(sellerCard as HTMLElement).getByLabelText('Baixar documento')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Substituir documento' })).not.toBeInTheDocument();

    view.rerender({
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING',
      },
      rows: [{
        documentType: 'doc_identidade', sellerRequired: true, buyerRequired: false,
        sellerDocs: [{ id: 1, documentType: 'doc_identidade', side: 'seller', status: 'PENDING', originalFileName: 'seller.pdf' }], buyerDocs: [],
      }],
      documentLabel: () => 'Documento Pessoal',
      documentFileName: (doc: { originalFileName?: string | null }) => doc.originalFileName ?? 'Documento',
    });
    expect(within(sellerCard as HTMLElement).getByLabelText('Editar documento')).toBeInTheDocument();
  });

  it('envia o documento e a URL corretos ao baixar e o id ao substituir', async () => {
    const onDownload = vi.fn();
    const onReplace = vi.fn();
    render(ContractDocumentMatrix, {
      contract: { id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1 },
      rows: [{
        documentType: 'doc_identidade', sellerRequired: true, buyerRequired: false,
        sellerDocs: [{ id: 9, documentType: 'doc_identidade', side: 'seller', status: 'PENDING', originalFileName: 'id.pdf', downloadUrl: '/negotiations/neg-1/documents/9/download' }], buyerDocs: [],
      }],
      documentLabel: () => 'Documento Pessoal', documentFileName: () => 'id.pdf',
      onDownload, onReplace,
    });
    await fireEvent.click(screen.getByLabelText('Editar documento'));
    await fireEvent.click(screen.getByLabelText('Baixar documento'));
    expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ id: 9, downloadUrl: '/negotiations/neg-1/documents/9/download' }));
    expect(screen.getByLabelText('Editar documento')).toHaveClass('h-10', 'w-10');

    await fireEvent.click(screen.getByLabelText('Editar documento'));
    expect(screen.getByLabelText('Substituir documento')).toHaveClass('h-10', 'w-10');
    await fireEvent.click(screen.getByLabelText('Substituir documento'));
    expect(onReplace).toHaveBeenCalledWith('doc_identidade', 'seller', 'doc_identidade', 9);
    expect(screen.queryByLabelText('Excluir documento')).not.toBeInTheDocument();
  });
});
