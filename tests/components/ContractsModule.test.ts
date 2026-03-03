import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPostMock,
  apiPutMock,
  apiPatchMock,
  apiDeleteMock,
  apiClientGetMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  apiClientGetMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
    put: apiPutMock,
    patch: apiPatchMock,
    delete: apiDeleteMock,
  },
  apiClient: {
    get: apiClientGetMock,
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

import ContractsModule from '../../src/lib/components/ContractsModule.svelte';

describe('ContractsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consome o payload realista do backend em /admin/contracts sem adaptadores extras', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'contract-admin-1',
          status: 'AWAITING_DOCS',
          negotiationId: 'neg-admin-1',
          propertyId: 900,
          propertyCode: 'RV-900',
          propertyTitle: 'Casa Contrato',
          propertyPurpose: 'Venda',
          capturingBrokerId: 30001,
          sellingBrokerId: 30002,
          capturingBrokerName: 'Captador',
          sellingBrokerName: 'Vendedor',
          sellerInfo: {
            estado_civil: 'Casado',
            profissao: 'Corretor',
            email: 'captador@test.com',
            telefone: '62999998888',
            dados_bancarios: 'Banco XPTO',
          },
          buyerInfo: {
            estado_civil: 'Solteiro',
            profissao: 'Analista',
            email: 'vendedor@test.com',
            telefone: '62999997777',
          },
          sellerApprovalStatus: 'APPROVED_WITH_RES',
          buyerApprovalStatus: 'PENDING',
          sellerApprovalReason: {
            reason: 'Documento legível.',
          },
          buyerApprovalReason: {},
          commissionData: {},
          workflowMetadata: {
            signatureMethod: 'online',
          },
          agencyName: 'Encontre Aqui',
          agencyAddress: 'Rua Central, 100',
          documents: [
            {
              id: 501,
              type: 'other',
              documentType: 'doc_identidade',
              side: 'seller',
              originalFileName: 'identidade.pdf',
              downloadUrl: '/negotiations/neg-admin-1/documents/501/download',
              createdAt: '2026-03-02T09:02:00.000Z',
            },
            {
              id: 502,
              type: 'other',
              documentType: 'doc_identidade',
              side: 'buyer',
              originalFileName: 'identidade_comprador.pdf',
              downloadUrl: '/negotiations/neg-admin-1/documents/502/download',
              createdAt: '2026-03-02T09:03:00.000Z',
            },
          ],
          createdAt: '2026-03-02T09:00:00.000Z',
          updatedAt: '2026-03-02T09:05:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(ContractsModule);

    expect(await screen.findByText('RV-900')).toBeInTheDocument();
    expect(screen.getByText('Casa Contrato')).toBeInTheDocument();
    expect(screen.getAllByText('Captador').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vendedor').length).toBeGreaterThan(0);

    const openReviewButton = await screen.findByRole('button', {
      name: 'Analisar Documentação',
    });
    await fireEvent.click(openReviewButton);

    expect(await screen.findByText('Dados Captador')).toBeInTheDocument();
    expect(screen.getByText('Banco XPTO')).toBeInTheDocument();

    const downloadButtons = screen.getAllByRole('button', { name: 'Baixar' });
    expect(downloadButtons.length).toBeGreaterThan(0);
  });

  it('bloqueia o Aprovar normal e mantém Aprovar c/ ressalvas ativo quando faltam dados obrigatórios', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'contract-test-1',
          status: 'AWAITING_DOCS',
          negotiationId: 'neg-test-1',
          propertyId: 501,
          propertyCode: 'RV-501',
          propertyTitle: 'Casa Teste',
          propertyPurpose: 'Venda',
          capturingBrokerId: 30001,
          sellingBrokerId: 30002,
          capturingBrokerName: 'Captador',
          sellingBrokerName: 'Vendedor',
          sellerInfo: {},
          buyerInfo: {},
          sellerApprovalStatus: 'PENDING',
          buyerApprovalStatus: 'PENDING',
          documents: [],
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
        },
      ],
      total: 1,
    });

    render(ContractsModule);

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/contracts?status=AWAITING_DOCS')
      );
    });

    const openReviewButton = await screen.findByRole('button', {
      name: 'Analisar Documentação',
    });
    await fireEvent.click(openReviewButton);

    expect(await screen.findByText('Aprovação bloqueada.')).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.startsWith('Captador sem:'))
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.startsWith('Documentos faltando:'))
    ).toBeInTheDocument();

    const approveButtons = [
      screen.getByRole('button', { name: 'Aprovar captador' }),
      screen.getByRole('button', { name: 'Aprovar vendedor' }),
    ];
    for (const button of approveButtons) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title');
    }

    const approveWithRemarksButtons = [
      screen.getByRole('button', { name: 'Aprovar c/ ressalvas captador' }),
      screen.getByRole('button', { name: 'Aprovar c/ ressalvas vendedor' }),
    ];
    for (const button of approveWithRemarksButtons) {
      expect(button).toBeEnabled();
    }
  });

  it('habilita o Aprovar quando os dados e documentos obrigatórios estão completos', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'contract-test-2',
          status: 'AWAITING_DOCS',
          negotiationId: 'neg-test-2',
          propertyId: 502,
          propertyCode: 'RV-502',
          propertyTitle: 'Casa Completa',
          propertyPurpose: 'Venda',
          capturingBrokerId: 30001,
          sellingBrokerId: 30002,
          capturingBrokerName: 'Captador',
          sellingBrokerName: 'Vendedor',
          sellerInfo: {
            estado_civil: 'Casado',
            profissao: 'Corretor',
            email: 'captador@test.com',
            telefone: '62999998888',
            dados_bancarios: 'Banco XPTO',
          },
          buyerInfo: {
            estado_civil: 'Solteiro',
            profissao: 'Corretor',
            email: 'vendedor@test.com',
            telefone: '62999997777',
          },
          sellerApprovalStatus: 'PENDING',
          buyerApprovalStatus: 'PENDING',
          documents: [
            { id: 1, documentType: 'doc_identidade', side: 'seller', status: 'APPROVED' },
            { id: 2, documentType: 'doc_identidade', side: 'buyer', status: 'APPROVED' },
            { id: 3, documentType: 'comprovante_endereco', side: 'seller', status: 'APPROVED' },
            { id: 4, documentType: 'comprovante_endereco', side: 'buyer', status: 'APPROVED' },
            {
              id: 5,
              documentType: 'certidao_casamento_nascimento',
              side: 'seller',
              status: 'APPROVED',
            },
            {
              id: 6,
              documentType: 'certidao_casamento_nascimento',
              side: 'buyer',
              status: 'APPROVED',
            },
            { id: 7, documentType: 'certidao_inteiro_teor', side: 'seller', status: 'APPROVED' },
            { id: 8, documentType: 'certidao_inteiro_teor', side: 'buyer', status: 'APPROVED' },
            { id: 9, documentType: 'certidao_onus_acoes', side: 'seller', status: 'APPROVED' },
            { id: 10, documentType: 'certidao_onus_acoes', side: 'buyer', status: 'APPROVED' },
          ],
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
        },
      ],
      total: 1,
    });

    render(ContractsModule);

    const openReviewButton = await screen.findByRole('button', {
      name: 'Analisar Documentação',
    });
    await fireEvent.click(openReviewButton);

    expect(screen.queryByText('Aprovação bloqueada.')).not.toBeInTheDocument();

    const approveButtons = [
      screen.getByRole('button', { name: 'Aprovar captador' }),
      screen.getByRole('button', { name: 'Aprovar vendedor' }),
    ];
    for (const button of approveButtons) {
      expect(button).toBeEnabled();
    }

    const approveWithRemarksButtons = [
      screen.getByRole('button', { name: 'Aprovar c/ ressalvas captador' }),
      screen.getByRole('button', { name: 'Aprovar c/ ressalvas vendedor' }),
    ];
    for (const button of approveWithRemarksButtons) {
      expect(button).toBeEnabled();
    }
  });

  it('exibe o Admin Override e o contexto de assinatura presencial em AWAITING_SIGNATURES', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [
            {
              id: 'contract-test-3',
              status: 'AWAITING_SIGNATURES',
              negotiationId: 'neg-test-3',
              propertyId: 503,
              propertyCode: 'RV-503',
              propertyTitle: 'Casa Presencial',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              workflowMetadata: {
                signatureMethod: 'in_person',
                signatureMethodDeclaredAt: '2026-03-01T12:00:00.000Z',
              },
              agencyName: 'Imobiliária Centro',
              agencyAddress: 'Rua das Flores, 123, Centro',
              documents: [],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-01T10:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      return {
        data: [],
        total: 0,
      };
    });

    render(ContractsModule);

    const signaturesTab = await screen.findByRole('button', {
      name: 'Aguardando Assinaturas',
    });
    await fireEvent.click(signaturesTab);

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/contracts?status=AWAITING_SIGNATURES')
      );
    });

    const finalizeButton = await screen.findByRole('button', {
      name: 'Finalizar Venda/Locação',
    });
    await fireEvent.click(finalizeButton);

    expect(
      await screen.findByText('Admin Override: Contrato Físico/Comprovantes')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'O corretor informou que a assinatura será entregue presencialmente.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Endereço de referência: Imobiliária Centro - Rua das Flores, 123, Centro'
      )
    ).toBeInTheDocument();

    const adminOverrideButton = screen.getByRole('button', {
      name: 'Anexar Documento Físico Assinado (Admin Override)',
    });
    expect(adminOverrideButton).toBeDisabled();
  });

  it('lista documentos bloqueados quando um documento está pendente de revisão', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'contract-test-4',
          status: 'AWAITING_DOCS',
          negotiationId: 'neg-test-4',
          propertyId: 504,
          propertyCode: 'RV-504',
          propertyTitle: 'Casa Pendente',
          propertyPurpose: 'Venda',
          capturingBrokerId: 30001,
          sellingBrokerId: 30002,
          capturingBrokerName: 'Captador',
          sellingBrokerName: 'Vendedor',
          sellerInfo: {
            estado_civil: 'Casado',
            profissao: 'Corretor',
            email: 'captador@test.com',
            telefone: '62999998888',
            dados_bancarios: 'Banco XPTO',
          },
          buyerInfo: {
            estado_civil: 'Solteiro',
            profissao: 'Corretor',
            email: 'vendedor@test.com',
            telefone: '62999997777',
          },
          sellerApprovalStatus: 'PENDING',
          buyerApprovalStatus: 'PENDING',
          documents: [
            { id: 1, documentType: 'doc_identidade', side: 'seller', status: 'PENDING' },
            { id: 2, documentType: 'doc_identidade', side: 'buyer', status: 'APPROVED' },
            { id: 3, documentType: 'comprovante_endereco', side: 'seller', status: 'APPROVED' },
            { id: 4, documentType: 'comprovante_endereco', side: 'buyer', status: 'APPROVED' },
            {
              id: 5,
              documentType: 'certidao_casamento_nascimento',
              side: 'seller',
              status: 'APPROVED',
            },
            {
              id: 6,
              documentType: 'certidao_casamento_nascimento',
              side: 'buyer',
              status: 'APPROVED',
            },
            { id: 7, documentType: 'certidao_inteiro_teor', side: 'seller', status: 'APPROVED' },
            { id: 8, documentType: 'certidao_inteiro_teor', side: 'buyer', status: 'APPROVED' },
            { id: 9, documentType: 'certidao_onus_acoes', side: 'seller', status: 'APPROVED' },
            { id: 10, documentType: 'certidao_onus_acoes', side: 'buyer', status: 'APPROVED' },
          ],
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
        },
      ],
      total: 1,
    });

    render(ContractsModule);

    const openReviewButton = await screen.findByRole('button', {
      name: 'Analisar Documentação',
    });
    await fireEvent.click(openReviewButton);

    expect(await screen.findByText('Aprovação bloqueada.')).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.startsWith('Documentos bloqueados:')
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (content) =>
          content.includes('Documento de Identidade (Captador): pendente')
      )
    ).toBeInTheDocument();

    const approveButtons = [
      screen.getByRole('button', { name: 'Aprovar captador' }),
      screen.getByRole('button', { name: 'Aprovar vendedor' }),
    ];
    for (const button of approveButtons) {
      expect(button).toBeDisabled();
    }
  });

  it('envia a aprovação normal quando os requisitos estão completos', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'contract-test-5',
          status: 'AWAITING_DOCS',
          negotiationId: 'neg-test-5',
          propertyId: 505,
          propertyCode: 'RV-505',
          propertyTitle: 'Casa Pronta',
          propertyPurpose: 'Venda',
          capturingBrokerId: 30001,
          sellingBrokerId: 30002,
          capturingBrokerName: 'Captador',
          sellingBrokerName: 'Vendedor',
          sellerInfo: {
            estado_civil: 'Casado',
            profissao: 'Corretor',
            email: 'captador@test.com',
            telefone: '62999998888',
            dados_bancarios: 'Banco XPTO',
          },
          buyerInfo: {
            estado_civil: 'Solteiro',
            profissao: 'Corretor',
            email: 'vendedor@test.com',
            telefone: '62999997777',
          },
          sellerApprovalStatus: 'PENDING',
          buyerApprovalStatus: 'PENDING',
          documents: [
            { id: 1, documentType: 'doc_identidade', side: 'seller', status: 'APPROVED' },
            { id: 2, documentType: 'doc_identidade', side: 'buyer', status: 'APPROVED' },
            { id: 3, documentType: 'comprovante_endereco', side: 'seller', status: 'APPROVED' },
            { id: 4, documentType: 'comprovante_endereco', side: 'buyer', status: 'APPROVED' },
            { id: 5, documentType: 'certidao_casamento_nascimento', side: 'seller', status: 'APPROVED' },
            { id: 6, documentType: 'certidao_casamento_nascimento', side: 'buyer', status: 'APPROVED' },
            { id: 7, documentType: 'certidao_inteiro_teor', side: 'seller', status: 'APPROVED' },
            { id: 8, documentType: 'certidao_inteiro_teor', side: 'buyer', status: 'APPROVED' },
            { id: 9, documentType: 'certidao_onus_acoes', side: 'seller', status: 'APPROVED' },
            { id: 10, documentType: 'certidao_onus_acoes', side: 'buyer', status: 'APPROVED' },
          ],
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
        },
      ],
      total: 1,
    });
    apiPutMock.mockResolvedValue({});

    render(ContractsModule);

    const openReviewButton = await screen.findByRole('button', {
      name: 'Analisar Documentação',
    });
    await fireEvent.click(openReviewButton);

    const approveButton = screen.getByRole('button', { name: 'Aprovar captador' });
    await fireEvent.click(approveButton);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        '/admin/contracts/contract-test-5/evaluate-side',
        {
          side: 'seller',
          status: 'APPROVED',
          reason: undefined,
        }
      );
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Avaliação registrada com sucesso.'
    );
  });

  it('bloqueia aprovação com ressalvas quando o motivo é curto demais', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'contract-test-6',
          status: 'AWAITING_DOCS',
          negotiationId: 'neg-test-6',
          propertyId: 506,
          propertyCode: 'RV-506',
          propertyTitle: 'Casa Ressalva',
          propertyPurpose: 'Venda',
          capturingBrokerId: 30001,
          sellingBrokerId: 30002,
          capturingBrokerName: 'Captador',
          sellingBrokerName: 'Vendedor',
          sellerInfo: {},
          buyerInfo: {},
          sellerApprovalStatus: 'PENDING',
          buyerApprovalStatus: 'PENDING',
          documents: [],
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
        },
      ],
      total: 1,
    });

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('ok');

    render(ContractsModule);

    const openReviewButton = await screen.findByRole('button', {
      name: 'Analisar Documentação',
    });
    await fireEvent.click(openReviewButton);

    const approveWithRemarksButton = screen.getByRole('button', {
      name: 'Aprovar c/ ressalvas captador',
    });
    await fireEvent.click(approveWithRemarksButton);

    expect(promptSpy).toHaveBeenCalled();
    expect(apiPutMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Motivo deve ter ao menos 3 caracteres.'
    );

    promptSpy.mockRestore();
  });
});
