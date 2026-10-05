import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import ContractDocumentMatrix from '../../src/lib/components/contracts/ContractDocumentMatrix.svelte';

describe('ContractDocumentMatrix', () => {
  it('mantém Outro vazio disponível para os dois lados sem marcar pendência', async () => {
    const onUpload = vi.fn();
    render(ContractDocumentMatrix, {
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING',
      },
      rows: [{ documentType: 'outro', sellerRequired: true, buyerRequired: false, sellerDocs: [], buyerDocs: [] }],
      documentLabel: () => 'Outro',
      onUpload,
    });

    expect(screen.getByText('Outro')).toBeInTheDocument();
    const uploadButtons = screen.getAllByRole('button', { name: 'Enviar' });
    expect(uploadButtons).toHaveLength(2);
    await fireEvent.click(uploadButtons[0]);
    await fireEvent.click(uploadButtons[1]);
    expect(onUpload).toHaveBeenNthCalledWith(1, 'outro', 'seller');
    expect(onUpload).toHaveBeenNthCalledWith(2, 'outro', 'buyer');
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('mostra Enviando somente no slot vazio que está em upload e o restaura ao limpar o estado', () => {
    const props = {
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING',
      },
      rows: [{
        documentType: 'doc_identidade', sellerRequired: true, buyerRequired: true, sellerDocs: [], buyerDocs: [],
      }],
      documentLabel: () => 'Documento Pessoal',
      matrixSlotKey: (documentType: string, side: string, existingDocumentType: string | null = null) =>
        `contract-1:${side}:${existingDocumentType ?? documentType}`,
    };
    const view = render(ContractDocumentMatrix, { ...props, matrixUploadingCounts: {} });
    expect(screen.getAllByRole('button', { name: 'Enviar' })).toHaveLength(2);

    view.unmount();
    const uploadingView = render(ContractDocumentMatrix, {
      ...props,
      matrixUploadingCounts: { 'contract-1:seller:doc_identidade': 1 },
    });
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviando…' }).querySelector('.animate-spin')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();

    uploadingView.unmount();
    render(ContractDocumentMatrix, { ...props, matrixUploadingCounts: {} });
    expect(screen.getAllByRole('button', { name: 'Enviar' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Enviando…' })).not.toBeInTheDocument();
  });

  it('mantém o loading de Outro isolado por lado e tipo efetivo', () => {
    render(ContractDocumentMatrix, {
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING',
      },
      rows: [{ documentType: 'outro', sellerRequired: true, buyerRequired: true, sellerDocs: [], buyerDocs: [] }],
      documentLabel: () => 'Outro',
      matrixUploadingCounts: { 'contract-1:seller:cliente_outro_01': 1 },
      matrixSlotKey: (_documentType: string, side: string, existingDocumentType: string | null = null) =>
        `contract-1:${side}:${existingDocumentType ?? 'cliente_outro_01'}`,
    });

    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('mantém Enviar no lado sem arquivo quando Outro existe apenas no outro lado', async () => {
    const onUpload = vi.fn();
    render(ContractDocumentMatrix, {
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING',
      },
      rows: [{
        documentType: 'outro', sellerRequired: true, buyerRequired: false,
        sellerDocs: [{ id: 71, documentType: 'cliente_outro_01', side: 'seller', status: 'PENDING', originalFileName: 'anexo.pdf' }], buyerDocs: [],
      }],
      documentLabel: () => 'Outro',
      documentFileName: () => 'anexo.pdf',
      documentStatusLabel: () => 'Em análise',
      documentStatusClass: () => 'bg-amber-100',
      onUpload,
    });

    expect(screen.getByText('Em análise')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onUpload).toHaveBeenCalledWith('outro', 'buyer');
  });

  it('mantém Outro independente quando um dos lados está readonly', async () => {
    const onUpload = vi.fn();
    const props = {
      rows: [{ documentType: 'outro', sellerRequired: true, buyerRequired: false, sellerDocs: [], buyerDocs: [] }],
      documentLabel: () => 'Outro',
      onUpload,
    };
    const view = render(ContractDocumentMatrix, {
      ...props,
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'APPROVED', buyerApprovalStatus: 'PENDING',
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onUpload).toHaveBeenCalledWith('outro', 'buyer');

    view.unmount();
    render(ContractDocumentMatrix, {
      ...props,
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'APPROVED',
      },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onUpload).toHaveBeenLastCalledWith('outro', 'seller');
  });

  it('mantém Enviar no seller quando Outro existe apenas no buyer', async () => {
    const onUpload = vi.fn();
    render(ContractDocumentMatrix, {
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING',
      },
      rows: [{
        documentType: 'outro', sellerRequired: false, buyerRequired: true,
        sellerDocs: [], buyerDocs: [{ id: 72, documentType: 'cliente_outro_01', side: 'buyer', status: 'PENDING', originalFileName: 'anexo-buyer.pdf' }],
      }],
      documentLabel: () => 'Outro',
      documentFileName: () => 'anexo-buyer.pdf',
      documentStatusLabel: () => 'Em análise',
      documentStatusClass: () => 'bg-amber-100',
      onUpload,
    });

    expect(screen.getByText('anexo-buyer.pdf')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onUpload).toHaveBeenCalledWith('outro', 'seller');
  });

  it('mantém Pendente e dispara o upload em documento obrigatório vazio pendente', async () => {
    const onUpload = vi.fn();
    render(ContractDocumentMatrix, {
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING',
      },
      rows: [{ documentType: 'doc_identidade', sellerRequired: true, buyerRequired: false, sellerDocs: [], buyerDocs: [] }],
      documentLabel: () => 'Documento Pessoal',
      onUpload,
    });

    expect(screen.getByText('Pendente')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith('doc_identidade', 'seller');
  });

  it('mantém o envio disponível durante o reenvio documental', () => {
    render(ContractDocumentMatrix, {
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING',
        workflowMetadata: { awaiting_document_resubmission: { seller: { reason: 'Reenviar documentos' } } },
      },
      rows: [{ documentType: 'doc_identidade', sellerRequired: true, buyerRequired: false, sellerDocs: [], buyerDocs: [] }],
      documentLabel: () => 'Documento Pessoal',
    });

    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('não mostra envio em slot vazio de lado aprovado', () => {
    render(ContractDocumentMatrix, {
      contract: {
        id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1,
        sellerApprovalStatus: 'APPROVED', buyerApprovalStatus: 'PENDING',
      },
      rows: [{ documentType: 'doc_identidade', sellerRequired: true, buyerRequired: false, sellerDocs: [], buyerDocs: [] }],
      documentLabel: () => 'Documento Pessoal',
    });

    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument();
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
      documentStatusLabel: () => 'Aprovado com observação',
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

    await fireEvent.click(screen.getByLabelText('Editar documento'));
    await fireEvent.click(screen.getByLabelText('Substituir documento'));
    expect(onReplace).toHaveBeenCalledWith('doc_identidade', 'seller', 'doc_identidade', 9);
    expect(screen.queryByLabelText('Excluir documento')).not.toBeInTheDocument();
  });

  it('reage à limpeza do loading de Substituir depois de uma atualização do contrato', async () => {
    const props = {
      contract: { id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1 },
      rows: [{
        documentType: 'doc_identidade', sellerRequired: true, buyerRequired: false,
        sellerDocs: [{ id: 9, documentType: 'doc_identidade', side: 'seller', status: 'PENDING', originalFileName: 'id.pdf' }], buyerDocs: [],
      }],
      documentLabel: () => 'Documento Pessoal',
      documentFileName: () => 'id.pdf',
      matrixSlotKey: (documentType: string, side: string, existingDocumentType: string | null = null) =>
        `contract-1:${side}:${existingDocumentType ?? documentType}`,
    };
    const view = render(ContractDocumentMatrix, {
      ...props,
      matrixUploadingCounts: {},
    });

    await fireEvent.click(screen.getByLabelText('Editar documento'));
    expect(screen.getByLabelText('Substituir documento').querySelector('.animate-spin')).toBeNull();

    view.rerender({
      ...props,
      matrixUploadingCounts: { 'contract-1:seller:doc_identidade': 1 },
    });
    expect(screen.getByLabelText('Substituir documento').querySelector('.animate-spin')).not.toBeNull();

    view.rerender({
      ...props,
      matrixUploadingCounts: {},
    });
    expect(screen.getByLabelText('Substituir documento').querySelector('.animate-spin')).toBeNull();
  });

  it('mostra o spinner de revisão na ação individual que está em andamento', async () => {
    const props = {
      contract: { id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1 },
      rows: [{
        documentType: 'doc_identidade', sellerRequired: true, buyerRequired: false,
        sellerDocs: [{ id: 9, documentType: 'doc_identidade', side: 'seller', status: 'PENDING', originalFileName: 'id.pdf' }], buyerDocs: [],
      }],
      documentLabel: () => 'Documento Pessoal',
      documentFileName: () => 'id.pdf',
      reviewDocumentId: 9,
    };

    const approvingView = render(ContractDocumentMatrix, { ...props, reviewDocumentAction: 'APPROVED' as const });
    await fireEvent.click(screen.getByLabelText('Editar documento'));
    expect(screen.getByLabelText('Aprovar documento').querySelector('.animate-spin')).not.toBeNull();
    expect(screen.getByLabelText('Rejeitar documento').querySelector('.animate-spin')).toBeNull();
    approvingView.unmount();

    render(ContractDocumentMatrix, { ...props, reviewDocumentAction: 'REJECTED' as const });
    await fireEvent.click(screen.getByLabelText('Editar documento'));
    expect(screen.getByLabelText('Aprovar documento').querySelector('.animate-spin')).toBeNull();
    expect(screen.getByLabelText('Rejeitar documento').querySelector('.animate-spin')).not.toBeNull();
  });

  it('associa o loading de Outro ao tipo efetivo do documento', async () => {
    render(ContractDocumentMatrix, {
      contract: { id: 'contract-1', status: 'AWAITING_DOCS', negotiationId: 'neg-1', propertyId: 1 },
      rows: [{
        documentType: 'outro', sellerRequired: true, buyerRequired: false,
        sellerDocs: [
          { id: 1, documentType: 'cliente_outro_01', side: 'seller', status: 'PENDING', originalFileName: 'primeiro.pdf' },
          { id: 2, documentType: 'cliente_outro_02', side: 'seller', status: 'PENDING', originalFileName: 'segundo.pdf' },
        ],
        buyerDocs: [],
      }],
      documentLabel: () => 'Outro',
      documentFileName: (doc: { originalFileName?: string | null }) => doc.originalFileName ?? 'Documento',
      matrixUploadingCounts: { 'contract-1:seller:cliente_outro_01': 1 },
      matrixSlotKey: (documentType: string, side: string, existingDocumentType: string | null = null) =>
        `contract-1:${side}:${existingDocumentType ?? documentType}`,
    });

    const firstDocument = screen.getByRole('button', { name: 'primeiro.pdf' }).parentElement?.parentElement;
    const secondDocument = screen.getByRole('button', { name: 'segundo.pdf' }).parentElement?.parentElement;
    expect(firstDocument).not.toBeNull();
    expect(secondDocument).not.toBeNull();

    await fireEvent.click(within(firstDocument as HTMLElement).getByLabelText('Editar documento'));
    expect(within(firstDocument as HTMLElement).getByLabelText('Substituir documento').querySelector('.animate-spin')).not.toBeNull();

    await fireEvent.click(within(secondDocument as HTMLElement).getByLabelText('Editar documento'));
    expect(within(secondDocument as HTMLElement).getByLabelText('Substituir documento').querySelector('.animate-spin')).toBeNull();
  });
});
