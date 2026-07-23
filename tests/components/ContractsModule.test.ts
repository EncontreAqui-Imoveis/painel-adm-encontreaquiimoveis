import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { within } from '@testing-library/dom';
import { tick } from 'svelte';

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
    pdfGetDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn(async () => ({
          getViewport: vi.fn(() => ({ width: 640, height: 900 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
          getTextContent: vi.fn(async () => ({ items: [] })),
        })),
        destroy: vi.fn(async () => {}),
      }),
    });
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
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('/admin/contracts?status=AWAITING_DOCS')) {
        return {
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
              buyer_client_name: 'Cliente Comprador',
              buyerClientName: 'Cliente Comprador',
              clientName: 'Cliente Comprador',
              clientCpf: '11122233344',
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
            {
              id: 'contract-admin-rejected-1',
              status: 'AWAITING_DOCS',
              negotiationId: 'neg-admin-rejected-1',
              propertyId: 901,
              propertyCode: 'RV-901',
              propertyTitle: 'Casa Rejeitada',
              propertyImageUrl: 'https://cdn.example.com/property-901.jpg',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              sellerApprovalStatus: 'REJECTED',
              buyerApprovalStatus: 'PENDING',
              approvalProgress: {
                status: 'REJECTED',
                label: 'Rejeitado',
              },
              documents: [],
              createdAt: '2026-03-02T09:00:00.000Z',
              updatedAt: '2026-03-02T09:05:00.000Z',
            },
          ],
          total: 2,
          page: 1,
          limit: 20,
        };
      }

      if (endpoint === '/contracts/contract-admin-1') {
        return {
          contract: {
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
            buyer_client_name: 'Cliente Comprador',
            buyerClientName: 'Cliente Comprador',
            clientName: 'Cliente Comprador',
            clientCpf: '11122233344',
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
        };
      }

      return { data: [], total: 0 };
    });
    apiClientGetMock.mockImplementation(async (endpoint: string) => {
      if (String(endpoint).includes('/download')) {
        return {
          data: new Blob(['preview'], { type: 'application/pdf' }),
          headers: { 'content-type': 'application/pdf' },
        };
      }
      return { data: [], total: 0 };
    });
    apiPatchMock.mockResolvedValue({ data: { message: 'Documento aprovado com sucesso.' } });

    render(ContractsModule);

    expect(
      await screen.findByText((content) => content.includes('RV-900'))
    ).toBeInTheDocument();
    expect(screen.getByText('Casa Contrato')).toBeInTheDocument();
    expect(screen.queryByText('Casa Rejeitada')).not.toBeInTheDocument();
    expect(screen.getByText('Em análise')).toBeInTheDocument();
    expect(screen.getByAltText('Foto do imóvel Casa Contrato')).toBeInTheDocument();
    expect(screen.getAllByText(/Vendedor/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Parte compradora/locatária')).toBeInTheDocument();
    expect(screen.getByText('Cliente Comprador')).toBeInTheDocument();
    const openReviewButton = await screen.findByRole('button', {
      name: 'Analisar Documentação',
    });
    await fireEvent.click(openReviewButton);

    expect(screen.getByRole('button', { name: /danfe/i })).toBeInTheDocument();
    expect(await screen.findByText('Dados Vendedor')).toBeInTheDocument();
    expect(screen.getByText('2 responsáveis designados')).toBeInTheDocument();
    // Document actions are intentionally grouped under the compact edit menu.
    expect(screen.getAllByLabelText('Editar documento').length).toBeGreaterThan(0);
    await fireEvent.click(screen.getAllByLabelText('Editar documento')[0]);
    expect(screen.getByRole('menu', { name: 'Ações do documento' })).toBeInTheDocument();
    await fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu', { name: 'Ações do documento' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Enviar' }).length).toBeGreaterThan(5);
    expect(screen.getAllByRole('button', { name: /^Aprovar\s*documento$/i }).length).toBeGreaterThan(0);
    await fireEvent.click(screen.getAllByRole('button', { name: /^Aprovar\s*documento$/i })[0]);
    expect(apiPatchMock).toHaveBeenCalledWith(
      '/contracts/contract-admin-1/documents/501/status',
      { status: 'APPROVED' }
    );

    // A file name now opens the browser's native viewer rather than an in-app PDF modal.
    await fireEvent.click(screen.getByRole('button', { name: /danfe/i }));
    expect(screen.queryByRole('dialog', { name: /visualiza/i })).not.toBeInTheDocument();
  });

  it('hidrata os detalhes completos ao abrir o modal quando a listagem vier incompleta', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('/admin/contracts?status=AWAITING_DOCS')) {
        return {
          data: [
            {
              id: 'contract-hydrate-1',
              status: 'AWAITING_DOCS',
              negotiationId: 'neg-hydrate-1',
              propertyId: 901,
              propertyCode: 'RV-901',
              propertyTitle: 'Casa Hidratação',
              propertyImageUrl: 'https://cdn.example.com/property-901.jpg',
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
                nome: 'Cliente Comprador',
                estado_civil: 'Solteiro',
                profissao: 'Analista',
                email: 'comprador@test.com',
                telefone: '62999997777',
              },
              buyer_name: 'Cliente Comprador',
              sellerApprovalStatus: 'APPROVED',
              buyerApprovalStatus: 'PENDING',
              sellerApprovalReason: null,
              buyerApprovalReason: null,
              commissionData: {},
              workflowMetadata: {},
              responsibleUserIds: [],
              agencyName: 'Encontre Aqui',
              agencyAddress: 'Rua Central, 100',
              documents: [],
              createdAt: '2026-03-02T09:00:00.000Z',
              updatedAt: '2026-03-02T09:00:00.000Z',
            },
          ],
          total: 1,
        };
      }

      if (endpoint === '/contracts/contract-hydrate-1') {
        return {
          contract: {
            id: 'contract-hydrate-1',
            status: 'AWAITING_DOCS',
            negotiationId: 'neg-hydrate-1',
            propertyId: 901,
            propertyCode: 'RV-901',
            propertyTitle: 'Casa Hidratação',
            propertyImageUrl: 'https://cdn.example.com/property-901.jpg',
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
              nome: 'Cliente Comprador',
              estado_civil: 'Solteiro',
              profissao: 'Analista',
              email: 'comprador@test.com',
              telefone: '62999997777',
            },
            buyer_name: 'Cliente Comprador',
            sellerApprovalStatus: 'APPROVED',
            buyerApprovalStatus: 'PENDING',
            sellerApprovalReason: null,
            buyerApprovalReason: null,
            commissionData: {},
            workflowMetadata: {},
            responsibleUserIds: [],
            agencyName: 'Encontre Aqui',
            agencyAddress: 'Rua Central, 100',
            documents: [],
            createdAt: '2026-03-02T09:00:00.000Z',
            updatedAt: '2026-03-02T09:00:00.000Z',
          },
          documents: [],
        };
      }

      return { data: [], total: 0 };
    });
    apiClientGetMock.mockResolvedValue({
      data: new Blob(['preview'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' },
    });

    render(ContractsModule);

    const openReviewButton = await screen.findByRole('button', {
      name: 'Analisar Documentação',
    });
    await fireEvent.click(openReviewButton);

    const dialog = await screen.findByRole('dialog', {
      name: 'Análise de Documentação',
    });
    await waitFor(() => {
      expect(dialog.textContent).toContain('Cliente Comprador');
    });
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
                seller: [{ category: 'outro', applicability: 'optional' }],
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
    expect(uploadButtons).toHaveLength(1);

    const hiddenInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(hiddenInput).toBeTruthy();

    await fireEvent.click(uploadButtons[0]);
    await fireEvent.change(hiddenInput, {
      target: {
        files: [new File(['seller-doc-1'], 'seller-1.pdf', { type: 'application/pdf' })],
      },
    });

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledTimes(1);
    });

    const formData = apiClientPostMock.mock.calls[0][1] as FormData;
    expect(formData.get('documentType')).toBe('cliente_outro_01');
    expect(formData.get('documentCategory')).toBe('outro');
    expect(formData.get('side')).toBe('seller');
    await waitFor(() => {
      expect(screen.getAllByLabelText('Editar documento')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Adicionar outro' })).toBeInTheDocument();
    });
  });

  it('envia o documento pessoal explícito do cônjuge para buyer', async () => {
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
    expect(formData.get('documentType')).toBe('doc_identidade_conjuge');
    expect(formData.get('documentCategory')).toBe('conjuge_documentos');
    expect(formData.get('side')).toBe('buyer');
    expect(screen.getByLabelText('Editar documento')).toBeInTheDocument();
  });

  it.skip('bloqueia o Aprovar normal e mantém Aprovar c/ ressalvas ativo quando faltam dados obrigatórios', async () => {
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
      screen.getByText((content) => content.startsWith('Anunciante sem:'))
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.startsWith('Documentos faltando:'))
    ).toBeInTheDocument();

    const approveButtons = [
      screen.getByRole('button', { name: /^Aprovaranunciante$/i }),
      screen.getByRole('button', { name: /^Aprovarcomprador$/i }),
    ];
    for (const button of approveButtons) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title');
    }

    const approveWithRemarksButtons = [
      screen.getByRole('button', { name: /^Aprovar c\/ ressalvasanunciante$/i }),
      screen.getByRole('button', { name: /^Aprovar c\/ ressalvascomprador$/i }),
    ];
    for (const button of approveWithRemarksButtons) {
      expect(button).toBeEnabled();
    }
  });

  it.skip('habilita o Aprovar quando os dados e documentos obrigatórios estão completos', async () => {
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
      screen.getByRole('button', { name: /^Aprovaranunciante$/i }),
      screen.getByRole('button', { name: /^Aprovarcomprador$/i }),
    ];
    for (const button of approveButtons) {
      expect(button).toBeEnabled();
    }

    const approveWithRemarksButtons = [
      screen.getByRole('button', { name: /^Aprovar c\/ ressalvasanunciante$/i }),
      screen.getByRole('button', { name: /^Aprovar c\/ ressalvascomprador$/i }),
    ];
    for (const button of approveWithRemarksButtons) {
      expect(button).toBeEnabled();
    }
  });

  it('exibe o formulário de comissões acima dos documentos e remove o admin override em AWAITING_SIGNATURES', async () => {
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

    expect(screen.queryByText('Admin Override: Contrato Físico/Comprovantes')).not.toBeInTheDocument();
    expect(screen.getByText('Formulário de Comissões')).toBeInTheDocument();
    expect(screen.getByText('Contrato físico / comprovantes')).toBeInTheDocument();
    expect(screen.getByText('Documentos para conferência')).toBeInTheDocument();
    expect(screen.getByText('Formulário de Comissões').compareDocumentPosition(
      screen.getByText('Documentos para conferência')
    ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: /Escolher arquivo/i })).toBeInTheDocument();
  });

  it('envia o anexo de documento assinado em AWAITING_SIGNATURES', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      const contract = {
        id: 'contract-test-sign-upload-1',
        status: 'AWAITING_SIGNATURES',
        negotiationId: 'neg-test-sign-upload-1',
        propertyId: 604,
        propertyCode: 'RV-604',
        propertyTitle: 'Casa Upload Assinatura',
        propertyPurpose: 'Venda',
        capturingBrokerId: 30001,
        sellingBrokerId: 30002,
        capturingBrokerName: 'Captador',
        sellingBrokerName: 'Vendedor',
        documents: [],
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z',
      };

      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [contract],
          total: 1,
        };
      }

      if (endpoint.includes('/contracts/contract-test-sign-upload-1')) {
        return {
          contract,
          documents: [],
        };
      }

      return {
        data: [],
        total: 0,
      };
    });
    apiClientPostMock.mockResolvedValue({ data: {} });

    render(ContractsModule);
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    await fireEvent.click(await screen.findByRole('button', { name: 'Aguardando Assinaturas' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Finalizar Venda/Locação' }));

    await fireEvent.click(screen.getByRole('button', { name: /Escolher arquivo/i }));
    expect(clickSpy).toHaveBeenCalled();

    const signedFileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(signedFileInput).not.toBeNull();
    if (!signedFileInput) {
      throw new Error('signed document input not found');
    }
    const signedPdf = new File(['%PDF-1.4 signed document%'], 'contrato_assinado.pdf', {
      type: 'application/pdf',
    });
    await fireEvent.change(signedFileInput, {
      target: { files: [signedPdf] },
    });

    expect(screen.getByText('contrato_assinado.pdf')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Anexar documento físico' }));

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledWith(
        '/admin/contracts/contract-test-sign-upload-1/signed-docs',
        expect.any(FormData)
      );
    });

    const form = apiClientPostMock.mock.calls[0][1] as FormData;
    expect(form.get('documentType')).toBe('contrato_assinado');
    expect(form.get('file')).toBeInstanceOf(File);
    expect((form.get('file') as File).name).toBe('contrato_assinado.pdf');
    clickSpy.mockRestore();
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
                  originalFileName: 'identidade_vendedor.pdf',
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

      if (endpoint === '/contracts/contract-test-draft-1') {
        return {
          contract: {
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
          },
          documents: [
            {
              id: 6011,
              documentType: 'doc_identidade',
              side: 'seller',
              status: 'APPROVED',
              originalFileName: 'identidade_vendedor.pdf',
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
    expect(screen.getByText('identidade_vend...pdf')).toBeInTheDocument();
    expect(screen.getByText('endereco_vended...pdf')).toBeInTheDocument();
    expect(screen.getAllByText(/Vendedor/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Comprador').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Visualizar' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Baixar' }).length).toBeGreaterThan(0);
  });

  it('permite prosseguir com a mesma minuta sem reenviar arquivo quando já existe PDF', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=IN_DRAFT')) {
        return {
          data: [
            {
              id: 'contract-test-draft-keep-1',
              status: 'IN_DRAFT',
              negotiationId: 'neg-test-draft-keep-1',
              propertyId: 602,
              propertyCode: 'RV-602',
              propertyTitle: 'Casa Minuta Existente',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 6201,
                  documentType: 'contrato_minuta',
                  originalFileName: 'minuta_atual.pdf',
                  downloadUrl: '/negotiations/neg-test-draft-keep-1/documents/6201/download',
                  metadata: { contractId: 'contract-test-draft-keep-1' },
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
    apiClientPostMock.mockResolvedValue({ data: {} });

    render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Em Confecção' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Anexar Minuta' }));

    expect(screen.getByRole('button', { name: 'Prosseguir com a mesma minuta' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Prosseguir com a mesma minuta' }));

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledWith(
        '/admin/contracts/contract-test-draft-keep-1/draft',
        expect.any(FormData)
      );
    });

    const form = apiClientPostMock.mock.calls[0][1] as FormData;
    expect(form.get('file')).toBeNull();
    expect(form.get('reuseCurrentDraft')).toBe('true');
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

    expect(screen.getByRole('button', { name: 'PDF da minuta' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum arquivo selecionado.')).toBeInTheDocument();

    const draftFileInput = document.querySelector('#draft-pdf') as HTMLInputElement | null;
    expect(draftFileInput).not.toBeNull();
    if (!draftFileInput) {
      throw new Error('draft-pdf input not found');
    }

    const draftFile = new File(['%PDF-1.4 draft%'], 'minuta.pdf', {
      type: 'application/pdf',
    });
    await fireEvent.change(draftFileInput, {
      target: { files: [draftFile] },
    });
    const submitDraftButton = screen
      .getAllByRole('button', { name: 'Anexar Minuta' })
      .at(-1);
    expect(submitDraftButton).toBeDefined();
    if (!submitDraftButton) {
      throw new Error('submit draft button not found');
    }
    await fireEvent.click(submitDraftButton);

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledWith(
        '/admin/contracts/contract-test-draft-required-1/draft',
        expect.any(FormData)
      );
    });

    const form = apiClientPostMock.mock.calls[0][1] as FormData;
    expect(form.get('side')).toBe('seller');
    expect(form.get('file')).toBeInstanceOf(File);
    expect((form.get('file') as File).name).toBe('minuta.pdf');
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
      await screen.findByText('Minuta atual')
    ).toBeInTheDocument();
    expect(screen.getAllByText('minuta_atual.pdf').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Trocar minuta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prosseguir com a mesma minuta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir minuta' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Substituir minuta' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Se quiser trocar a minuta atual, selecione um novo PDF abaixo.')
    ).toBeInTheDocument();

    const draftFileInput = document.querySelector('#draft-pdf') as HTMLInputElement | null;
    expect(draftFileInput).not.toBeNull();
    if (!draftFileInput) {
      throw new Error('draft-pdf input not found');
    }

    const replacementFile = new File(['%PDF-1.4 replacement%'], 'nova_minuta.pdf', {
      type: 'application/pdf',
    });
    await fireEvent.change(draftFileInput, {
      target: { files: [replacementFile] },
    });

    expect(screen.getByRole('button', { name: 'Trocar minuta' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Substituir minuta' })).toBeInTheDocument();
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
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Voltar para a etapa anterior' })
    );

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

      if (endpoint === '/contracts/contract-test-sign-1') {
        return {
          contract: {
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
          },
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
    expect(screen.getByText('identidade_capt...pdf')).toBeInTheDocument();
    expect(screen.getByText('identidade_vend...pdf')).toBeInTheDocument();
    expect(screen.getByText('Contrato (Minuta)')).toBeInTheDocument();
  });

  it('abre a proposta assinada no visualizador customizado e baixa o PDF de fato', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [
            {
              id: 'contract-test-sign-view-1',
              status: 'AWAITING_SIGNATURES',
              negotiationId: 'neg-test-sign-view-1',
              propertyId: 614,
              propertyCode: 'RV-614',
              propertyTitle: 'Casa Proposta Assinada',
              propertyPurpose: 'Venda',
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 6141,
                  documentType: 'contrato_assinado',
                  originalFileName: 'proposta_04e4c102-32dd-4b9f-ac80-b46eb5c666a0.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-view-1/documents/6141/download',
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

      if (endpoint === '/contracts/contract-test-sign-view-1') {
        return {
          contract: {
            id: 'contract-test-sign-view-1',
            status: 'AWAITING_SIGNATURES',
            negotiationId: 'neg-test-sign-view-1',
            propertyId: 614,
            propertyCode: 'RV-614',
            propertyTitle: 'Casa Proposta Assinada',
            propertyPurpose: 'Venda',
            capturingBrokerName: 'Captador',
            sellingBrokerName: 'Vendedor',
          },
          documents: [
            {
              id: 6141,
              documentType: 'contrato_assinado',
              originalFileName: 'proposta_04e4c102-32dd-4b9f-ac80-b46eb5c666a0.pdf',
              downloadUrl: '/negotiations/neg-test-sign-view-1/documents/6141/download',
              createdAt: '2026-03-02T10:00:00.000Z',
            },
          ],
        };
      }

      return {
        data: [],
        total: 0,
      };
    });
    apiClientGetMock.mockResolvedValue({
      data: new Blob(['%PDF-1.4 test signed proposal%'], { type: 'application/pdf' }),
      headers: {
        'content-disposition':
          'attachment; filename="proposta_04e4c102-32dd-4b9f-ac80-b46eb5c666a0.pdf"',
      },
    });
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:signed-proposal');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window);

    render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Aguardando Assinaturas' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Finalizar Venda/Locação' }));

    const viewButton = await screen.findByRole('button', { name: 'Visualizar na Web' });
    const downloadButton = screen.getByRole('button', { name: 'Baixar PDF' });

    await fireEvent.click(viewButton);
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'proposta_04e4c102-32dd-4b9f-ac80-b46eb5c666a0.pdf' })
      ).toBeInTheDocument();
    });

    await fireEvent.click(downloadButton);
    await waitFor(() => {
      expect(apiClientGetMock).toHaveBeenCalledWith(
        '/negotiations/neg-test-sign-view-1/documents/6141/download',
        { responseType: 'blob' }
      );
      expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    });

    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(0);

    windowOpenSpy.mockRestore();
    anchorClickSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
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
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Voltar para a etapa anterior' })
    );

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

    const valorInput = screen.getByLabelText('Valor de venda (base da comissão) (R$)') as HTMLInputElement;
    const captadorInput = screen.getByLabelText('Comissão Captador') as HTMLInputElement;
    const vendedorInput = screen.getByLabelText('Comissão do vendedor') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui') as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '1234,56' } });
    await fireEvent.input(captadorInput, { target: { value: '500,00' } });
    await fireEvent.input(vendedorInput, { target: { value: '500,00' } });
    await fireEvent.input(taxaInput, { target: { value: '234,56' } });

    expect(valorInput.value).toBe('1234,56');
    expect(captadorInput.value).toBe('500,00');
    expect(vendedorInput.value).toBe('500,00');
    expect(taxaInput.value).toBe('234,56');

    const submitFinalizeButton = screen.getAllByRole('button', {
      name: 'Finalizar Venda/Locação',
    })[1];
    await fireEvent.click(submitFinalizeButton);

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/admin/contracts/contract-test-sign-2/finalize', {
        commission_data: {
          valorBaseComissao: 1234.56,
          comissaoCaptador: 500,
          comissaoVendedor: 500,
          taxaPlataforma: 234.56,
        },
      });
    });
  });

  it('permite editar os nomes do captador e do vendedor na visualização do VGV', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [
            {
              id: 'contract-test-sign-name-1',
              status: 'AWAITING_SIGNATURES',
              negotiationId: 'neg-test-sign-name-1',
              propertyId: 603,
              propertyCode: 'RV-603',
              propertyTitle: 'Casa Nomes',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador Original',
              sellingBrokerName: 'Vendedor Original',
              sellerInfo: { nome: 'Vendedor Original' },
              documents: [
                {
                  id: 6031,
                  documentType: 'contrato_assinado',
                  originalFileName: 'contrato_assinado.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-name-1/documents/6031/download',
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

    const captadorNomeInput = (await screen.findByLabelText('Nome do captador')) as HTMLInputElement;
    const vendedorNomeInput = (await screen.findByLabelText('Nome do vendedor')) as HTMLInputElement;

    expect(captadorNomeInput.value).toBe('Captador Original');
    expect(vendedorNomeInput.value).toBe('Vendedor Original');
    expect(screen.getByText('Captador:')).toBeInTheDocument();
    expect(screen.getByText('Vendedor:')).toBeInTheDocument();
    expect(screen.getAllByText('Captador Original').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vendedor Original').length).toBeGreaterThan(0);

    await fireEvent.input(captadorNomeInput, { target: { value: 'Captador Editado' } });
    await fireEvent.input(vendedorNomeInput, { target: { value: 'Vendedor Editado' } });

    expect(captadorNomeInput.value).toBe('Captador Editado');
    expect(vendedorNomeInput.value).toBe('Vendedor Editado');
    expect(screen.getAllByText('Captador Editado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vendedor Editado').length).toBeGreaterThan(0);
  });

  it('bloqueia a finalização quando a soma das comissões não fecha o valor da venda', async () => {
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
              dealType: 'sale',
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
    await tick();

    const valorInput = screen.getByLabelText('Valor de venda (base da comissão) (R$)') as HTMLInputElement;
    const captadorInput = (await screen.findByLabelText('Comissão Captador')) as HTMLInputElement;
    const vendedorInput = (await screen.findByLabelText('Comissão do vendedor')) as HTMLInputElement;
    const taxaInput = (await screen.findByLabelText('Taxa Encontre Aqui')) as HTMLInputElement;
    await fireEvent.input(valorInput, { target: { value: '1000,00' } });
    await fireEvent.input(captadorInput, { target: { value: '50' } });
    await fireEvent.input(vendedorInput, { target: { value: '250' } });
    await fireEvent.input(taxaInput, { target: { value: '25' } });

    expect(captadorInput.value).toBe('50');
    expect(vendedorInput.value).toBe('250');
    expect(taxaInput.value).toBe('25');

    const submitFinalizeButton = screen.getAllByRole('button', {
      name: 'Finalizar Venda/Locação',
    })[1];
    await fireEvent.click(submitFinalizeButton);

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Na venda, a soma das comissões precisa fechar exatamente 100% do valor.'
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
    await tick();

    await fireEvent.click(
      screen.getByRole('button', { name: 'Alternar modo da comissão captador' })
    );
    await fireEvent.click(
      screen.getByRole('button', { name: 'Alternar modo da comissão do vendedor' })
    );
    await fireEvent.click(
      screen.getByRole('button', { name: 'Alternar modo da taxa da plataforma' })
    );
    await tick();

    const valorInput = screen.getByLabelText('Valor de venda (base da comissão) (R$)') as HTMLInputElement;
    const captadorInput = (await screen.findByLabelText('Comissão Captador')) as HTMLInputElement;
    const vendedorInput = (await screen.findByLabelText('Comissão do vendedor')) as HTMLInputElement;
    const taxaInput = (await screen.findByLabelText('Taxa Encontre Aqui')) as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '1000,00' } });
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
          valorBaseComissao: 1000,
          comissaoCaptador: 500,
          comissaoVendedor: 250,
          taxaPlataforma: 250,
        },
      });
    });
  });

  it('permite mistura de percentual e valor real por campo na finalização', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_SIGNATURES')) {
        return {
          data: [
            {
              id: 'contract-test-sign-4b',
              status: 'AWAITING_SIGNATURES',
              negotiationId: 'neg-test-sign-4b',
              propertyId: 605,
              propertyCode: 'RV-605',
              propertyTitle: 'Casa Mista',
              propertyPurpose: 'Venda',
              capturingBrokerId: 30001,
              sellingBrokerId: 30002,
              capturingBrokerName: 'Captador',
              sellingBrokerName: 'Vendedor',
              documents: [
                {
                  id: 6052,
                  documentType: 'contrato_assinado',
                  originalFileName: 'contrato_assinado.pdf',
                  downloadUrl: '/negotiations/neg-test-sign-4b/documents/6052/download',
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
    await tick();

    await fireEvent.click(
      screen.getByRole('button', { name: 'Alternar modo da comissão captador' })
    );
    await tick();

    const valorInput = screen.getByLabelText('Valor de venda (base da comissão) (R$)') as HTMLInputElement;
    const captadorInput = (await screen.findByLabelText('Comissão Captador')) as HTMLInputElement;
    const vendedorInput = screen.getByLabelText('Comissão do vendedor') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui') as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '1000,00' } });
    await fireEvent.input(captadorInput, { target: { value: '50' } });
    await fireEvent.input(vendedorInput, { target: { value: '250,00' } });
    await fireEvent.input(taxaInput, { target: { value: '250,00' } });

    const submitFinalizeButton = screen.getAllByRole('button', {
      name: 'Finalizar Venda/Locação',
    })[1];
    await fireEvent.click(submitFinalizeButton);

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/admin/contracts/contract-test-sign-4b/finalize', {
        commission_data: {
          valorBaseComissao: 1000,
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

    const valorInput = screen.getByLabelText('Valor de venda (base da comissão) (R$)') as HTMLInputElement;
    const captadorInput = screen.getByLabelText('Comissão Captador') as HTMLInputElement;
    const vendedorInput = screen.getByLabelText('Comissão do vendedor') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui') as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '1000,00' } });
    await fireEvent.input(captadorInput, { target: { value: '500' } });
    await fireEvent.input(vendedorInput, { target: { value: '300' } });
    await fireEvent.input(taxaInput, { target: { value: '200' } });

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

    expect(await screen.findByText('Vendedor com ressalvas')).toBeInTheDocument();

    await fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(await screen.findByText('Aprovação com ressalvas')).toBeInTheDocument();
    expect(
      screen.getByText('Atualizar CPF e reenviar certidão na próxima revisão.')
    ).toBeInTheDocument();
  });

  it('libera o imóvel ao excluir o contrato finalizado', async () => {
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
    apiDeleteMock.mockResolvedValue({});
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Finalizados' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    await fireEvent.click(
      screen.getByRole('button', { name: 'Liberar imóvel e excluir contrato' })
    );

    await waitFor(() => {
      expect(apiDeleteMock).toHaveBeenCalledWith('/admin/contracts/contract-final-2');
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Contrato excluído e imóvel liberado.');
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
        };
      }

      return { data: [], total: 0 };
    });
    apiDeleteMock.mockResolvedValue({});
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(ContractsModule);

    await fireEvent.click(await screen.findByRole('button', { name: 'Finalizados' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(await screen.findByText('contrato_assina...pdf')).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: 'Excluir' });
    await fireEvent.click(deleteButtons[1]);

    await waitFor(() => {
      expect(apiDeleteMock).toHaveBeenCalledWith('/admin/contracts/contract-final-3/finalized-docs/7031');
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Documento removido com sucesso.');
    confirmSpy.mockRestore();
  });

  it.skip('lista documentos bloqueados quando um documento está pendente de revisão', async () => {
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
          content.includes('Documento de Identidade (Anunciante): pendente')
      )
    ).toBeInTheDocument();

    const approveButtons = [
      screen.getByRole('button', { name: /^Aprovaranunciante$/i }),
      screen.getByRole('button', { name: /^Aprovarcomprador$/i }),
    ];
    for (const button of approveButtons) {
      expect(button).toBeDisabled();
    }
  });

  it.skip('envia a aprovação normal quando os requisitos estão completos', async () => {
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

    const approveButton = screen.getByRole('button', { name: /^Aprovaranunciante$/i });
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
  it.skip('mantém o modal aberto e troca os botões quando apenas um lado é avaliado', async () => {
    let side1Calls = 0;
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('/admin/contracts?status=AWAITING_DOCS')) {
        return {
          data: [
            {
              id: 'contract-test-side-1',
              status: 'AWAITING_DOCS',
              negotiationId: 'neg-test-side-1',
              propertyId: 506,
              propertyCode: 'RV-506',
              propertyTitle: 'Casa Avaliação Parcial',
              propertyImageUrl: 'https://cdn.example.com/property-506.jpg',
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
                profissao: 'Comprador',
                email: 'comprador@test.com',
                telefone: '62999997777',
              },
              buyer_client_name: 'Cliente Comprador',
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
        };
      }

      if (endpoint === '/contracts/contract-test-side-1') {
        side1Calls++;
        return {
          contract: {
            id: 'contract-test-side-1',
            status: 'AWAITING_DOCS',
            negotiationId: 'neg-test-side-1',
            propertyId: 506,
            propertyCode: 'RV-506',
            propertyTitle: 'Casa Avaliação Parcial',
            propertyImageUrl: 'https://cdn.example.com/property-506.jpg',
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
              profissao: 'Comprador',
              email: 'comprador@test.com',
              telefone: '62999997777',
            },
            buyerClientName: 'Cliente Comprador',
            sellerApprovalStatus: side1Calls > 1 ? 'APPROVED' : 'PENDING',
            buyerApprovalStatus: 'PENDING',
            approvalProgress: {
              status: 'IN_PROGRESS',
              label: 'Em análise',
              nextStep: 'Aguardando aprovação do comprador',
            },
          },
          documents: [],
        };
      }

      return { data: [], total: 0 };
    });
    apiPutMock.mockResolvedValue({
      data: {
        movedToDraft: false,
      },
    });

    render(ContractsModule);

    const openReviewButton = await screen.findByRole('button', {
      name: 'Analisar Documentação',
    });
    await fireEvent.click(openReviewButton);

    const approveButton = screen.getByRole('button', { name: /^Aprovaranunciante$/i });
    await fireEvent.click(approveButton);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        '/admin/contracts/contract-test-side-1/evaluate-side',
        {
          side: 'seller',
          status: 'APPROVED',
          reason: undefined,
        }
      );
    });

    expect(screen.getByText('Dados Vendedor')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Rejeitar' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Reiniciar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Aprovaranunciante$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Aprovar c\/ ressalvasanunciante$/i })).not.toBeInTheDocument();
  });

  it.skip('bloqueia aprovação com ressalvas quando o motivo é curto demais', async () => {
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
      name: /^Aprovar c\/ ressalvasanunciante$/i,
    });
    await fireEvent.click(approveWithRemarksButton);

    expect(promptSpy).toHaveBeenCalled();
    expect(apiPutMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Motivo deve ter ao menos 3 caracteres.'
    );

    promptSpy.mockRestore();
  });

  it('exibe o status individual de cada documento nessa etapa', async () => {
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

    expect(screen.getByText('Não aplicável')).toBeInTheDocument();
    expect(screen.getByText('Aprovado com ressalvas')).toBeInTheDocument();
  });
});
