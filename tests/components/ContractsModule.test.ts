import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { within } from '@testing-library/dom';

const {
  apiGetMock,
  apiPostMock,
  apiPutMock,
  apiPatchMock,
  apiDeleteMock,
  apiClientGetMock,
  apiClientPostMock,
  pdfGetDocumentMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  apiClientGetMock: vi.fn(),
  apiClientPostMock: vi.fn(),
  pdfGetDocumentMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

const canvasContextMock = {
  fillStyle: '',
  font: '',
  textBaseline: 'top',
  save: vi.fn(),
  restore: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn((text: string) => ({ width: String(text ?? '').length * 10 })),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(96 * 96 * 4).fill(255),
  })),
};

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
    post: apiClientPostMock,
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock('pdfjs-dist/build/pdf.mjs', () => ({
  GlobalWorkerOptions: {
    workerSrc: '',
  },
  getDocument: pdfGetDocumentMock,
}));

import ContractsModule from '../../src/lib/components/ContractsModule.svelte';

describe('ContractsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => canvasContextMock),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
      configurable: true,
      value: vi.fn(() => 'data:image/png;base64,ZmFrZQ=='),
    });
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
          propertyImageUrl: 'https://cdn.example.com/property-900.jpg',
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
          buyerClientName: 'Cliente Comprador',
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
          responsibleUserIds: [30003, 30005],
          agencyName: 'Encontre Aqui',
          agencyAddress: 'Rua Central, 100',
          documents: [
            {
              id: 501,
              type: 'other',
              documentType: 'doc_identidade',
              side: 'seller',
              originalFileName: 'danfe (peÃ§as).pdf',
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
    apiClientGetMock.mockImplementation(async (endpoint: string) => {
      if (String(endpoint).includes('/download')) {
        return {
          data: new Blob(['preview'], { type: 'application/pdf' }),
          headers: { 'content-type': 'application/pdf' },
        };
      }
      return { data: null, headers: {} };
    });

    render(ContractsModule);

    expect(
      await screen.findByText((content) => content.includes('RV-900'))
    ).toBeInTheDocument();
    expect(screen.getByText('Casa Contrato')).toBeInTheDocument();
    expect(screen.getByAltText('Foto do imóvel Casa Contrato')).toBeInTheDocument();
    expect(screen.getAllByText('Captador').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Comprador').length).toBeGreaterThan(0);
    expect(screen.getByText('Cliente Comprador')).toBeInTheDocument();
    const openReviewButton = await screen.findByRole('button', {
      name: 'Analisar Documentação',
    });
    await fireEvent.click(openReviewButton);

    expect(screen.getByRole('button', { name: 'danfe (peças).pdf' })).toBeInTheDocument();
    expect(await screen.findByText('Dados Captador')).toBeInTheDocument();
    expect(screen.getByText('2 responsáveis designados')).toBeInTheDocument();
    expect(screen.getByDisplayValue('captador@test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(62) 99999-8888')).toBeInTheDocument();
    expect(screen.getByDisplayValue('vendedor@test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(62) 99999-7777')).toBeInTheDocument();

    const downloadButtons = screen.getAllByRole('button', { name: 'Baixar' });
    expect(downloadButtons.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Enviar' }).length).toBeGreaterThan(5);

    pdfGetDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getViewport: ({ scale }: { scale: number }) => ({ width: 612 * scale, height: 792 * scale }),
          render: () => ({ promise: Promise.resolve() }),
          getTextContent: async () => ({
            items: [{ str: 'Contrato' }, { str: 'de' }, { str: 'Compra' }],
          }),
        }),
        destroy: async () => {},
      }),
    });

    await fireEvent.click(screen.getByRole('button', { name: 'danfe (peças).pdf' }));
    const previewDialog = await screen.findByRole('dialog', {
      name: 'danfe (peças).pdf',
    });
    expect(within(previewDialog).getByText('Documento do contrato')).toBeInTheDocument();
    expect(
      await within(previewDialog).findByRole('button', { name: 'Substituir documento' })
    ).toBeInTheDocument();
    expect(await within(previewDialog).findByRole('button', { name: 'Excluir documento' })).toBeInTheDocument();
    expect(await within(previewDialog).findByTestId('document-preview-pdf-visible-text')).toHaveTextContent(
      'Contrato de Compra'
    );
    expect(await within(previewDialog).findByTestId('document-preview-pdf-text')).toHaveTextContent(
      'Contrato de Compra'
    );
  });

  it('envia slot outro explícito na matriz para seller', async () => {
    const sellerOutroDocs: Array<Record<string, unknown>> = [];
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('/admin/contracts?status=AWAITING_DOCS')) {
        return {
          data: [
            {
              id: 'contract-outro-1',
              status: 'AWAITING_DOCS',
              negotiationId: 'neg-outro-1',
              propertyId: 700,
              propertyCode: 'RV-700',
              propertyTitle: 'Casa Outro',
              propertyPurpose: 'Venda',
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              sellerInfo: {},
              buyerInfo: {},
              documentRequirements: {
                seller: [{ category: 'dados_bancarios', applicability: 'required' }],
                buyer: [{ category: 'conjuge_documentos', applicability: 'not_applicable' }],
              },
              documents: sellerOutroDocs,
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-01T10:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      if (endpoint.includes('/contracts/contract-outro-1')) {
        return {
          contract: {
            id: 'contract-outro-1',
            status: 'AWAITING_DOCS',
            negotiationId: 'neg-outro-1',
            propertyId: 700,
            propertyCode: 'RV-700',
            propertyTitle: 'Casa Outro',
            propertyPurpose: 'Venda',
            capturingBrokerName: 'Captador',
            sellingBrokerName: 'Vendedor',
            documents: sellerOutroDocs,
          },
          documents: sellerOutroDocs,
        };
      }

      return { data: [], total: 0 };
    });

    apiClientPostMock.mockImplementation(async (_endpoint: string, body: FormData) => {
      sellerOutroDocs.push({
        id: `seller-outro-${sellerOutroDocs.length + 1}`,
        documentType: body.get('documentType'),
        documentCategory: body.get('documentCategory'),
        side: body.get('side'),
      });
      return { data: {} };
    });

    const { container } = render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Analisar Documentação' }));

    const uploadButtons = screen.getAllByRole('button', { name: 'Enviar' });
    expect(uploadButtons).toHaveLength(2);

    const hiddenInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(hiddenInput).toBeTruthy();

    await fireEvent.click(uploadButtons[0]);
    await fireEvent.change(hiddenInput, {
      target: {
        files: [
          new File(['seller-doc-1'], 'seller-1.pdf', { type: 'application/pdf' }),
          new File(['seller-doc-2'], 'seller-2.pdf', { type: 'application/pdf' }),
        ],
      },
    });

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledTimes(2);
    });

    let formData = apiClientPostMock.mock.calls[0][1] as FormData;
    expect(formData.get('documentType')).toBe('cliente_outro_01');
    expect(formData.get('documentCategory')).toBe('outro');
    expect(formData.get('side')).toBe('seller');
    formData = apiClientPostMock.mock.calls[1][1] as FormData;
    expect(formData.get('documentType')).toBe('cliente_outro_02');
    expect(formData.get('documentCategory')).toBe('outro');
    expect(formData.get('side')).toBe('seller');

    expect(screen.getAllByRole('button', { name: 'Substituir' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Adicionar outro' })).toBeInTheDocument();
  });

  it('envia slot outro explícito na matriz para buyer', async () => {
    const buyerOutroDocs: Array<Record<string, unknown>> = [];
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('/admin/contracts?status=AWAITING_DOCS')) {
        return {
          data: [
            {
              id: 'contract-outro-2',
              status: 'AWAITING_DOCS',
              negotiationId: 'neg-outro-2',
              propertyId: 701,
              propertyCode: 'RV-701',
              propertyTitle: 'Casa Outro Buyer',
              propertyPurpose: 'Venda',
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              sellerInfo: {},
              buyerInfo: {},
              documentRequirements: {
                seller: [{ category: 'dados_bancarios', applicability: 'not_applicable' }],
                buyer: [{ category: 'conjuge_documentos', applicability: 'required' }],
              },
              documents: buyerOutroDocs,
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-01T10:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      if (endpoint.includes('/contracts/contract-outro-2')) {
        return {
          contract: {
            id: 'contract-outro-2',
            status: 'AWAITING_DOCS',
            negotiationId: 'neg-outro-2',
            propertyId: 701,
            propertyCode: 'RV-701',
            propertyTitle: 'Casa Outro Buyer',
            propertyPurpose: 'Venda',
            capturingBrokerName: 'Captador',
            sellingBrokerName: 'Vendedor',
            documents: buyerOutroDocs,
          },
          documents: buyerOutroDocs,
        };
      }

      return { data: [], total: 0 };
    });

    apiClientPostMock.mockImplementation(async (_endpoint: string, body: FormData) => {
      buyerOutroDocs.push({
        id: `buyer-outro-${buyerOutroDocs.length + 1}`,
        documentType: body.get('documentType'),
        documentCategory: body.get('documentCategory'),
        side: body.get('side'),
      });
      return { data: {} };
    });

    const { container } = render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Analisar Documentação' }));

    const uploadButtons = screen.getAllByRole('button', { name: 'Enviar' });
    expect(uploadButtons).toHaveLength(1);

    const hiddenInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(hiddenInput).toBeTruthy();

    await fireEvent.click(uploadButtons[0]);
    await fireEvent.change(hiddenInput, {
      target: {
        files: [new File(['buyer-doc'], 'buyer.pdf', { type: 'application/pdf' })],
      },
    });

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledTimes(1);
    });

    const formData = apiClientPostMock.mock.calls[0][1] as FormData;
    expect(formData.get('documentType')).toBe('cliente_outro_01');
    expect(formData.get('documentCategory')).toBe('outro');
    expect(formData.get('side')).toBe('buyer');
    expect(screen.getByRole('button', { name: 'Adicionar outro' })).toBeInTheDocument();
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
      screen.getByRole('button', { name: /Aprovar\s*captador/i }),
      screen.getByRole('button', { name: /Aprovar\s*comprador/i }),
    ];
    for (const button of approveButtons) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title');
    }

    const approveWithRemarksButtons = [
      screen.getByRole('button', { name: /Aprovar c\/ ressalvas\s*captador/i }),
      screen.getByRole('button', { name: /Aprovar c\/ ressalvas\s*comprador/i }),
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
      screen.getByRole('button', { name: /Aprovar\s*captador/i }),
      screen.getByRole('button', { name: /Aprovar\s*comprador/i }),
    ];
    for (const button of approveButtons) {
      expect(button).toBeEnabled();
    }

    const approveWithRemarksButtons = [
      screen.getByRole('button', { name: /Aprovar c\/ ressalvas\s*captador/i }),
      screen.getByRole('button', { name: /Aprovar c\/ ressalvas\s*comprador/i }),
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
    expect(screen.getByRole('option', { name: 'Outro' })).toBeInTheDocument();
  });

  it('lista todos os documentos existentes no modal de minuta em IN_DRAFT', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=IN_DRAFT')) {
        return {
          data: [
            {
              id: 'contract-test-draft-1',
              status: 'IN_DRAFT',
              negotiationId: 'neg-test-draft-1',
              propertyId: 601,
              propertyCode: 'RV-601',
              propertyTitle: 'Casa Minuta',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 6011,
                  documentType: 'doc_identidade',
                  side: 'seller',
                  status: 'APPROVED',
                  originalFileName: 'identidade_captador.pdf',
                  downloadUrl: '/negotiations/neg-test-draft-1/documents/6011/download',
                  createdAt: '2026-03-01T10:00:00.000Z',
                },
                {
                  id: 6012,
                  documentType: 'comprovante_endereco',
                  side: 'buyer',
                  status: 'APPROVED',
                  originalFileName: 'endereco_vendedor.pdf',
                  downloadUrl: '/negotiations/neg-test-draft-1/documents/6012/download',
                  createdAt: '2026-03-01T11:00:00.000Z',
                },
              ],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-01T12:00:00.000Z',
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

    const draftTab = await screen.findByRole('button', {
      name: 'Em Confecção',
    });
    await fireEvent.click(draftTab);

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        expect.stringContaining('/admin/contracts?status=IN_DRAFT')
      );
    });

    const openDraftButton = await screen.findByRole('button', {
      name: 'Anexar Minuta',
    });
    await fireEvent.click(openDraftButton);

    expect(await screen.findByText('Documentos do contrato')).toBeInTheDocument();
    expect(screen.getByText('identidade_captador.pdf')).toBeInTheDocument();
    expect(screen.getByText('endereco_vendedor.pdf')).toBeInTheDocument();
    expect(screen.getAllByText('Captador').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Comprador').length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Baixar/Visualizar' }).length
    ).toBeGreaterThan(0);
  });

  it('deixa claro que a minuta é obrigatória quando ainda não existe PDF anexado', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=IN_DRAFT')) {
        return {
          data: [
            {
              id: 'contract-test-draft-required-1',
              status: 'IN_DRAFT',
              negotiationId: 'neg-test-draft-required-1',
              propertyId: 612,
              propertyCode: 'RV-612',
              propertyTitle: 'Casa Sem Minuta',
              propertyPurpose: 'Venda',
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-01T12:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      return { data: [], total: 0 };
    });

    render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Em Confecção' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Anexar Minuta' }));

    expect(
      await screen.findByText('Ainda não existe minuta anexada para este contrato.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Para avançar para a etapa de assinaturas, anexe o PDF da minuta.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('PDF da minuta')).toBeInTheDocument();
  });

  it('mostra a minuta atual e muda o CTA para atualizar quando já existe PDF', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=IN_DRAFT')) {
        return {
          data: [
            {
              id: 'contract-test-draft-existing-1',
              status: 'IN_DRAFT',
              negotiationId: 'neg-test-draft-existing-1',
              propertyId: 613,
              propertyCode: 'RV-613',
              propertyTitle: 'Casa Com Minuta',
              propertyPurpose: 'Venda',
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 6131,
                  documentType: 'contrato_minuta',
                  originalFileName: 'minuta_atual.pdf',
                  downloadUrl: '/negotiations/neg-test-draft-existing-1/documents/6131/download',
                  metadata: { contractId: 'contract-test-draft-existing-1' },
                  createdAt: '2026-03-01T09:00:00.000Z',
                },
              ],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-01T12:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      return { data: [], total: 0 };
    });

    render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Em Confecção' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Anexar Minuta' }));

    expect(
      await screen.findByText('Já existe uma minuta anexada para este contrato.')
    ).toBeInTheDocument();
    expect(screen.getByText('Minuta atual')).toBeInTheDocument();
    expect(screen.getAllByText('minuta_atual.pdf').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Novo PDF da minuta (opcional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atualizar minuta' })).toBeInTheDocument();
  });

  it('permite voltar de IN_DRAFT para a etapa anterior pelo modal', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=IN_DRAFT')) {
        return {
          data: [
            {
              id: 'contract-test-draft-back-1',
              status: 'IN_DRAFT',
              negotiationId: 'neg-test-draft-back-1',
              propertyId: 611,
              propertyCode: 'RV-611',
              propertyTitle: 'Casa Voltar Minuta',
              propertyPurpose: 'Venda',
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-01T12:00:00.000Z',
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
    apiPutMock.mockResolvedValue({
      data: {
        message:
          'Contrato reiniciado com sucesso. Todos os documentos vinculados foram removidos.',
      },
    });

    render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Em Confecção' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Anexar Minuta' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        '/admin/contracts/contract-test-draft-back-1/transition',
        { direction: 'previous' }
      );
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Contrato voltou para a aba de documentos pendentes.'
    );
  });

  it('mantém documentação anterior e minuta visíveis em AWAITING_SIGNATURES', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [
            {
              id: 'contract-test-sign-1',
              status: 'AWAITING_SIGNATURES',
              negotiationId: 'neg-test-sign-1',
              propertyId: 602,
              propertyCode: 'RV-602',
              propertyTitle: 'Casa Assinaturas',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 6021,
                  documentType: 'doc_identidade',
                  side: 'seller',
                  status: 'APPROVED',
                  originalFileName: 'identidade_captador.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-1/documents/6021/download',
                  metadata: { contractId: 'contract-test-sign-1' },
                  createdAt: '2026-03-01T09:00:00.000Z',
                },
                {
                  id: 6022,
                  documentType: 'doc_identidade',
                  side: 'buyer',
                  status: 'APPROVED',
                  originalFileName: 'identidade_vendedor.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-1/documents/6022/download',
                  metadata: { contractId: 'contract-test-sign-1' },
                  createdAt: '2026-03-01T09:10:00.000Z',
                },
                {
                  id: 6023,
                  documentType: 'contrato_minuta',
                  originalFileName: 'contrato_minuta.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-1/documents/6023/download',
                  metadata: { contractId: 'contract-test-sign-1' },
                  createdAt: '2026-03-02T08:00:00.000Z',
                },
                {
                  id: 6024,
                  documentType: 'contrato_assinado',
                  originalFileName: 'contrato_assinado.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-1/documents/6024/download',
                  metadata: { contractId: 'contract-test-sign-1' },
                  createdAt: '2026-03-02T10:00:00.000Z',
                },
              ],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-02T10:30:00.000Z',
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

    expect(await screen.findByText('Documentos para conferência')).toBeInTheDocument();
    expect(await screen.findByText('Todos os documentos do contrato')).toBeInTheDocument();
    expect(screen.getByText('contrato_minuta.pdf')).toBeInTheDocument();
    expect(screen.getByText('identidade_captador.pdf')).toBeInTheDocument();
    expect(screen.getByText('identidade_vendedor.pdf')).toBeInTheDocument();
    expect(screen.getByText('Contrato (Minuta)')).toBeInTheDocument();
  });

  it('permite voltar de AWAITING_SIGNATURES para a etapa anterior pelo modal', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [
            {
              id: 'contract-test-sign-back-1',
              status: 'AWAITING_SIGNATURES',
              negotiationId: 'neg-test-sign-back-1',
              propertyId: 612,
              propertyCode: 'RV-612',
              propertyTitle: 'Casa Voltar Assinatura',
              propertyPurpose: 'Venda',
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-02T10:00:00.000Z',
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
    apiPutMock.mockResolvedValue({
      data: {
        message:
          'Contrato reiniciado com sucesso. Todos os documentos vinculados foram removidos.',
      },
    });

    render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Aguardando Assinaturas' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Finalizar Venda/Locação' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        '/admin/contracts/contract-test-sign-back-1/transition',
        { direction: 'previous' }
      );
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Contrato voltou para a aba de confecção da minuta.'
    );
  });

  it('aplica máscara monetária nos campos de comissão em AWAITING_SIGNATURES e envia números no payload', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [
            {
              id: 'contract-test-sign-2',
              status: 'AWAITING_SIGNATURES',
              negotiationId: 'neg-test-sign-2',
              propertyId: 603,
              propertyCode: 'RV-603',
              propertyTitle: 'Casa Comissões',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 6031,
                  documentType: 'contrato_assinado',
                  originalFileName: 'contrato_assinado.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-2/documents/6031/download',
                  createdAt: '2026-03-02T10:00:00.000Z',
                },
              ],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-02T11:00:00.000Z',
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
    apiPostMock.mockResolvedValue({});

    render(ContractsModule);

    const signaturesTab = await screen.findByRole('button', {
      name: 'Aguardando Assinaturas',
    });
    await fireEvent.click(signaturesTab);

    const finalizeButton = await screen.findByRole('button', {
      name: 'Finalizar Venda/Locação',
    });
    await fireEvent.click(finalizeButton);

    const valorInput = screen.getByLabelText('Valor de Venda/Locação (R$)') as HTMLInputElement;
    const captadorInput = screen.getByLabelText('Comissão Captador (R$)') as HTMLInputElement;
    const vendedorInput = screen.getByLabelText('Comissão complementar (R$)') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui (R$)') as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '123456' } });
    await fireEvent.input(captadorInput, { target: { value: '50000' } });
    await fireEvent.input(vendedorInput, { target: { value: '50000' } });
    await fireEvent.input(taxaInput, { target: { value: '23456' } });

    expect(valorInput.value).toContain('1.234,56');
    expect(captadorInput.value).toContain('500,00');
    expect(vendedorInput.value).toContain('500,00');
    expect(taxaInput.value).toContain('234,56');

    const submitFinalizeButton = screen.getAllByRole('button', {
      name: 'Finalizar Venda/Locação',
    })[1];
    await fireEvent.click(submitFinalizeButton);

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/admin/contracts/contract-test-sign-2/finalize', {
        commission_data: {
          valorVenda: 1234.56,
          comissaoCaptador: 500,
          comissaoVendedor: 500,
          taxaPlataforma: 234.56,
        },
      });
    });
  });

  it('permite escolher percentual e converte as comissões para valor real no payload', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [
            {
              id: 'contract-test-sign-3',
              status: 'AWAITING_SIGNATURES',
              negotiationId: 'neg-test-sign-3',
              propertyId: 604,
              propertyCode: 'RV-604',
              propertyTitle: 'Casa Percentual',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 6041,
                  documentType: 'contrato_assinado',
                  originalFileName: 'contrato_assinado.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-3/documents/6041/download',
                  createdAt: '2026-03-02T10:00:00.000Z',
                },
              ],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-02T11:00:00.000Z',
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
    apiPostMock.mockResolvedValue({});

    render(ContractsModule);

    const signaturesTab = await screen.findByRole('button', {
      name: 'Aguardando Assinaturas',
    });
    await fireEvent.click(signaturesTab);

    const openFinalizeButton = await screen.findByRole('button', {
      name: 'Finalizar Venda/Locação',
    });
    await fireEvent.click(openFinalizeButton);

    await fireEvent.click(screen.getByRole('button', { name: 'Percentual (%)' }));

    const valorInput = screen.getByLabelText('Valor de Venda/Locação (R$)') as HTMLInputElement;
    const captadorInput = screen.getByLabelText('Comissão Captador (%)') as HTMLInputElement;
    const vendedorInput = screen.getByLabelText('Comissão complementar (%)') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui (%)') as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '100000' } });
    await fireEvent.input(captadorInput, { target: { value: '50' } });
    await fireEvent.input(vendedorInput, { target: { value: '250' } });
    await fireEvent.input(taxaInput, { target: { value: '25' } });

    expect(captadorInput.value).toBe('50');
    expect(vendedorInput.value).toBe('100');
    expect(taxaInput.value).toBe('25');

    const submitFinalizeButton = screen.getAllByRole('button', {
      name: 'Finalizar Venda/Locação',
    })[1];
    await fireEvent.click(submitFinalizeButton);

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Na venda, a soma dos percentuais precisa fechar exatamente 100% do valor.'
    );
  });

  it('converte percentuais válidos e exatos em valores reais na finalização', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [
            {
              id: 'contract-test-sign-4',
              status: 'AWAITING_SIGNATURES',
              negotiationId: 'neg-test-sign-4',
              propertyId: 605,
              propertyCode: 'RV-605',
              propertyTitle: 'Casa Percentual Exato',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 6051,
                  documentType: 'contrato_assinado',
                  originalFileName: 'contrato_assinado.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-4/documents/6051/download',
                  createdAt: '2026-03-02T10:00:00.000Z',
                },
              ],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-02T11:00:00.000Z',
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
    apiPostMock.mockResolvedValue({});

    render(ContractsModule);

    const signaturesTab = await screen.findByRole('button', {
      name: 'Aguardando Assinaturas',
    });
    await fireEvent.click(signaturesTab);

    const openFinalizeButton = await screen.findByRole('button', {
      name: 'Finalizar Venda/Locação',
    });
    await fireEvent.click(openFinalizeButton);

    await fireEvent.click(screen.getByRole('button', { name: 'Percentual (%)' }));

    const valorInput = screen.getByLabelText('Valor de Venda/Locação (R$)') as HTMLInputElement;
    const captadorInput = screen.getByLabelText('Comissão Captador (%)') as HTMLInputElement;
    const vendedorInput = screen.getByLabelText('Comissão complementar (%)') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui (%)') as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '100000' } });
    await fireEvent.input(captadorInput, { target: { value: '50' } });
    await fireEvent.input(vendedorInput, { target: { value: '25' } });
    await fireEvent.input(taxaInput, { target: { value: '25' } });

    const submitFinalizeButton = screen.getAllByRole('button', {
      name: 'Finalizar Venda/Locação',
    })[1];
    await fireEvent.click(submitFinalizeButton);

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/admin/contracts/contract-test-sign-4/finalize', {
        commission_data: {
          valorVenda: 1000,
          comissaoCaptador: 500,
          comissaoVendedor: 250,
          taxaPlataforma: 250,
        },
      });
    });
  });

  it('mostra a mensagem real do backend ao falhar a finalização', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [
            {
              id: 'contract-test-sign-5',
              status: 'AWAITING_SIGNATURES',
              negotiationId: 'neg-test-sign-5',
              propertyId: 606,
              propertyCode: 'RV-606',
              propertyTitle: 'Casa Erro Finalização',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 6061,
                  documentType: 'contrato_assinado',
                  originalFileName: 'contrato_assinado.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-5/documents/6061/download',
                  createdAt: '2026-03-02T10:00:00.000Z',
                },
              ],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-02T11:00:00.000Z',
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
    apiPostMock.mockRejectedValue({
      response: {
        data: {
          error: 'Na venda, a soma de comissões e taxa precisa fechar exatamente 100% do valor.',
          requestId: 'req-finalize-123',
        },
      },
      requestId: 'req-finalize-123',
    });

    render(ContractsModule);

    const signaturesTab = await screen.findByRole('button', {
      name: 'Aguardando Assinaturas',
    });
    await fireEvent.click(signaturesTab);

    const openFinalizeButton = await screen.findByRole('button', {
      name: 'Finalizar Venda/Locação',
    });
    await fireEvent.click(openFinalizeButton);

    const valorInput = screen.getByLabelText('Valor de Venda/Locação (R$)') as HTMLInputElement;
    const captadorInput = screen.getByLabelText('Comissão Captador (R$)') as HTMLInputElement;
    const vendedorInput = screen.getByLabelText('Comissão complementar (R$)') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui (R$)') as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '100000' } });
    await fireEvent.input(captadorInput, { target: { value: '50000' } });
    await fireEvent.input(vendedorInput, { target: { value: '30000' } });
    await fireEvent.input(taxaInput, { target: { value: '20000' } });

    const submitFinalizeButton = screen.getAllByRole('button', {
      name: 'Finalizar Venda/Locação',
    })[1];
    await fireEvent.click(submitFinalizeButton);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Na venda, a soma de comissões e taxa precisa fechar exatamente 100% do valor. (Req: req-finalize-123)'
      );
    });
  });

  it('não lista documentos de assinatura vinculados a outro contrato no modal de finalização', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [
            {
              id: 'contract-test-sign-6',
              status: 'AWAITING_SIGNATURES',
              negotiationId: 'neg-test-sign-6',
              propertyId: 607,
              propertyCode: 'RV-607',
              propertyTitle: 'Casa Contrato Atual',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 6071,
                  documentType: 'contrato_assinado',
                  originalFileName: 'contrato_atual.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-6/documents/6071/download',
                  metadata: { contractId: 'contract-test-sign-6' },
                  createdAt: '2026-03-02T10:00:00.000Z',
                },
                {
                  id: 6072,
                  documentType: 'comprovante_pagamento',
                  originalFileName: 'pagamento_outro_contrato.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-6/documents/6072/download',
                  metadata: { contractId: 'contract-old-1' },
                  createdAt: '2026-03-02T11:00:00.000Z',
                },
              ],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-02T11:00:00.000Z',
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

    const openFinalizeButton = await screen.findByRole('button', {
      name: 'Finalizar Venda/Locação',
    });
    await fireEvent.click(openFinalizeButton);

    expect(await screen.findByText('contrato_atual.pdf')).toBeInTheDocument();
    expect(screen.queryByText('pagamento_outro_contrato.pdf')).not.toBeInTheDocument();
  });

  it('mostra Editar e Excluir para contratos finalizados', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'contract-final-1',
          status: 'FINALIZED',
          negotiationId: 'neg-final-1',
          propertyId: 701,
          propertyCode: 'RV-701',
          propertyTitle: 'Casa Finalizada',
          propertyPurpose: 'Venda',
          capturingBrokerName: 'Captador',
          sellingBrokerName: 'Vendedor',
          documents: [],
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-03T10:00:00.000Z',
        },
      ],
      total: 1,
    });

    render(ContractsModule);

    const finalizedTab = await screen.findByRole('button', {
      name: 'Finalizados',
    });
    await fireEvent.click(finalizedTab);

    expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
  });

  it('mantém a sinalização de aprovado com ressalvas até o contrato finalizado', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'contract-final-remarks-1',
          status: 'FINALIZED',
          negotiationId: 'neg-final-remarks-1',
          propertyId: 711,
          propertyCode: 'RV-711',
          propertyTitle: 'Casa com Ressalvas',
          propertyPurpose: 'Venda',
          capturingBrokerName: 'Captador',
          sellingBrokerName: 'Vendedor',
          sellerApprovalStatus: 'APPROVED_WITH_RES',
          sellerApprovalReason: {
            reason: 'Atualizar CPF e reenviar certidão na próxima revisão.',
          },
          buyerApprovalStatus: 'APPROVED',
          buyerApprovalReason: null,
          documents: [],
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-03T10:00:00.000Z',
        },
      ],
      total: 1,
    });

    render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Finalizados' }));

    expect(await screen.findByText('Captador com ressalvas')).toBeInTheDocument();

    await fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(await screen.findByText('Aprovação com ressalvas')).toBeInTheDocument();
    expect(
      screen.getByText('Atualizar CPF e reenviar certidão na próxima revisão.')
    ).toBeInTheDocument();
  });

  it('reinicia contrato finalizado e remove da aba de finalizados', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=FINALIZED')) {
        return {
          data: [
            {
              id: 'contract-final-2',
              status: 'FINALIZED',
              negotiationId: 'neg-final-2',
              propertyId: 702,
              propertyCode: 'RV-702',
              propertyTitle: 'Casa Reabrir',
              propertyPurpose: 'Venda',
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-03T10:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      return { data: [], total: 0 };
    });
    apiPutMock.mockResolvedValue({
      data: {
        message:
          'Contrato reiniciado com sucesso. Todos os documentos vinculados foram removidos.',
      },
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Finalizados' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Reiniciar Contrato' }));

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith('/admin/contracts/contract-final-2/reopen', {});
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Contrato reiniciado com sucesso. Todos os documentos vinculados foram removidos.'
    );
    confirmSpy.mockRestore();
  });

  it('remove documento individual no editor de contrato finalizado', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=FINALIZED')) {
        return {
          data: [
            {
              id: 'contract-final-3',
              status: 'FINALIZED',
              negotiationId: 'neg-final-3',
              propertyId: 703,
              propertyCode: 'RV-703',
              propertyTitle: 'Casa Documento Final',
              propertyPurpose: 'Venda',
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 7031,
                  documentType: 'contrato_assinado',
                  originalFileName: 'contrato_assinado.pdf',
                  metadata: { contractId: 'contract-final-3' },
                  downloadUrl: '/negotiations/neg-final-3/documents/7031/download',
                  createdAt: '2026-03-03T10:00:00.000Z',
                },
              ],
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-03T10:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      if (endpoint === '/contracts/contract-final-3') {
        return {
          contract: {
            id: 'contract-final-3',
            status: 'FINALIZED',
            negotiationId: 'neg-final-3',
            propertyId: 703,
            propertyCode: 'RV-703',
            propertyTitle: 'Casa Documento Final',
            propertyPurpose: 'Venda',
            capturingBrokerName: 'Captador',
            sellingBrokerName: 'Vendedor',
          },
          documents: [],
        };
      }

      return { data: [], total: 0 };
    });
    apiDeleteMock.mockResolvedValue({});
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Finalizados' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(await screen.findByText('contrato_assinado.pdf')).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: 'Excluir' });
    await fireEvent.click(deleteButtons[1]);

    await waitFor(() => {
      expect(apiDeleteMock).toHaveBeenCalledWith('/admin/contracts/contract-final-3/finalized-docs/7031');
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Documento removido com sucesso.');
    confirmSpy.mockRestore();
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
      screen.getByRole('button', { name: /Aprovar\s*captador/i }),
      screen.getByRole('button', { name: /Aprovar\s*comprador/i }),
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

    const approveButton = screen.getByRole('button', { name: /Aprovar\s*captador/i });
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
      name: /Aprovar c\/ ressalvas\s*captador/i,
    });
    await fireEvent.click(approveWithRemarksButton);

    expect(promptSpy).toHaveBeenCalled();
    expect(apiPutMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Motivo deve ter ao menos 3 caracteres.'
    );

    promptSpy.mockRestore();
  });

  it('renderiza status documental NOT_APPLICABLE e APPROVED_WITH_RES no modal', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'contract-test-status-doc-1',
          status: 'AWAITING_DOCS',
          negotiationId: 'neg-test-status-doc-1',
          propertyId: 507,
          propertyCode: 'RV-507',
          propertyTitle: 'Casa Status Docs',
          propertyPurpose: 'Venda',
          capturingBrokerId: 30001,
          sellingBrokerId: 30002,
          capturingBrokerName: 'Captador',
          sellingBrokerName: 'Vendedor',
          sellerInfo: { estado_civil: 'Casado', profissao: 'Corretor', email: 'a@a.com', telefone: '1', dados_bancarios: 'Banco' },
          buyerInfo: { estado_civil: 'Solteiro', profissao: 'Comprador', email: 'b@b.com', telefone: '2' },
          sellerApprovalStatus: 'PENDING',
          buyerApprovalStatus: 'PENDING',
          documents: [
            { id: 1, documentType: 'doc_identidade', side: 'seller', status: 'NOT_APPLICABLE' },
            { id: 2, documentType: 'doc_identidade', side: 'buyer', status: 'APPROVED_WITH_RES' },
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

    expect(await screen.findByText('Não aplicável')).toBeInTheDocument();
  });
});
