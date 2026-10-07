import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { within } from '@testing-library/dom';
import { tick } from 'svelte';
import { adminSession } from '$lib/sessionState';

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
    adminSession.set({
      role: 'admin',
      capabilities: {
        canReviewDocuments: true,
        canReplaceDocuments: true,
        canCreateDocuments: true,
        canManageContractWorkflow: true,
        canDeleteDocuments: true,
        canDeleteEntities: true,
        canClearNotifications: true,
        canManageAdministration: true,
      },
    });
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
              sellerApprovalStatus: 'PENDING',
              buyerApprovalStatus: 'PENDING',
              workflowMetadata: {
                awaiting_document_resubmission: {
                  seller: {
                    reason: 'Documentos ilegíveis.',
                    requestedAt: '2026-10-03T12:00:00.000Z',
                    requestedBy: 1,
                    rejectedDocumentIds: [901],
                  },
                },
              },
              approvalProgress: {
                status: 'IN_PROGRESS',
                label: 'Aguardando reenvio documental',
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
    expect(screen.getByText('Casa Rejeitada')).toBeInTheDocument();
    expect(screen.getByText('Aguardando reenvio documental')).toBeInTheDocument();
    expect(screen.getAllByText('Situação:').length).toBeGreaterThan(0);
    expect(screen.queryByText('Situação final:')).not.toBeInTheDocument();
    expect(screen.getByText('Em análise')).toBeInTheDocument();
    expect(screen.getByAltText('Foto do imóvel Casa Contrato')).toBeInTheDocument();
    expect(screen.getAllByText(/Vendedor/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Parte compradora/locatária')).toBeInTheDocument();
    expect(screen.getByText('Cliente Comprador')).toBeInTheDocument();
    const contractRow = screen.getByText('Casa Contrato').closest('tr');
    expect(contractRow).not.toBeNull();
    const openReviewButton = within(contractRow!).getByRole('button', {
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
    expect(screen.getAllByRole('button', { name: 'Enviar' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^Aprovar\s*documento$/i }).length).toBeGreaterThan(0);
    await fireEvent.click(screen.getAllByRole('button', { name: /^Aprovar\s*documento$/i })[0]);
    expect(apiPatchMock).toHaveBeenCalledWith(
      '/contracts/contract-admin-1/documents/502/status',
      { status: 'APPROVED' }
    );

    // A file name now opens the browser's native viewer rather than an in-app PDF modal.
    await fireEvent.click(screen.getByRole('button', { name: /danfe/i }));
    expect(screen.queryByRole('dialog', { name: /visualiza/i })).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: /Motivos de rejeição/i }));
    expect(await screen.findByText('Rejeição do Vendedor')).toBeInTheDocument();
  });

  it('mantém o lado pendente após rejeição, orienta o reenvio e libera os slots vazios', async () => {
    let awaitingResubmission = false;
    const baseContract = {
      id: 'contract-resubmission-1',
      status: 'AWAITING_DOCS',
      negotiationId: 'neg-resubmission-1',
      propertyId: 911,
      propertyCode: 'RV-911',
      propertyTitle: 'Casa para Reenvio',
      dealType: 'rent' as const,
      sellerApprovalStatus: 'PENDING' as const,
      buyerApprovalStatus: 'PENDING' as const,
      documentRequirementMatrix: {
        seller: [{ category: 'identidade', applicability: 'required', preferredDocumentType: 'doc_identidade' }],
        buyer: [],
      },
    };

    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('/admin/contracts?status=AWAITING_DOCS')) {
        return { data: [baseContract], total: 1 };
      }
      if (endpoint === '/contracts/contract-resubmission-1') {
        return {
          contract: {
            ...baseContract,
            sellerApprovalReason: awaitingResubmission
              ? { reason: 'Documento ilegível.' }
              : null,
            workflowMetadata: awaitingResubmission
              ? {
                  awaiting_document_resubmission: {
                    seller: {
                      reason: 'Documento ilegível.',
                      requestedAt: '2026-10-03T12:00:00.000Z',
                      requestedBy: 1,
                      rejectedDocumentIds: [81],
                    },
                  },
                }
              : {},
            approvalProgress: awaitingResubmission
              ? { status: 'IN_PROGRESS', label: 'Aguardando reenvio documental' }
              : { status: 'IN_PROGRESS', label: 'Em análise' },
          },
          documents: awaitingResubmission
            ? [{
                id: 81,
                documentType: 'doc_identidade',
                side: 'seller',
                status: 'REJECTED',
                originalFileName: 'documento-rejeitado.pdf',
              }]
            : [],
        };
      }
      if (endpoint.includes('/document-rejections')) return { rejections: [] };
      return { data: [], total: 0 };
    });
    apiPutMock.mockImplementation(async () => {
      awaitingResubmission = true;
      return { data: { movedToDraft: false } };
    });
    vi.spyOn(window, 'prompt').mockReturnValue('Documento ilegível.');

    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Analisar Documentação' }));
    await fireEvent.click(screen.getAllByRole('button', { name: 'Rejeitar' })[0]);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        '/admin/contracts/contract-resubmission-1/evaluate-side',
        { side: 'seller', status: 'REJECTED', reason: 'Documento ilegível.' }
      );
    });
    expect(await screen.findByText('Aguardando reenvio de documentos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reiniciar' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Enviar' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'documento-rejeitado.pdf' })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: /Motivos de rejeição/i }));
    expect(await screen.findByText('Rejeição do Locador')).toBeInTheDocument();
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
    expect(uploadButtons).toHaveLength(2);

    const hiddenInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(hiddenInput).toBeTruthy();
    expect(hiddenInput.multiple).toBe(false);
    const pickerClick = vi.spyOn(hiddenInput, 'click');

    await fireEvent.click(uploadButtons[0]);
    expect(pickerClick).toHaveBeenCalledTimes(1);
    await fireEvent.click(uploadButtons[0]);
    expect(pickerClick).toHaveBeenCalledTimes(1);
    await fireEvent.change(hiddenInput, {
      target: {
        files: [
          new File(['seller-doc-1'], 'seller-1.pdf', { type: 'application/pdf' }),
          new File(['seller-doc-2'], 'seller-2.pdf', { type: 'application/pdf' }),
        ],
      },
    });
    expect(toastErrorMock).toHaveBeenCalledWith('Selecione apenas um arquivo por vez.');
    expect(apiClientPostMock).not.toHaveBeenCalled();

    await fireEvent.click(uploadButtons[0]);
    expect(hiddenInput.multiple).toBe(false);
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

    await fireEvent.click(screen.getByRole('button', { name: 'Adicionar outro' }));
    expect(hiddenInput.multiple).toBe(false);
    await fireEvent.change(hiddenInput, {
      target: {
        files: [new File(['seller-doc-2'], 'seller-2.pdf', { type: 'application/pdf' })],
      },
    });
    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledTimes(2);
    });
    const secondFormData = apiClientPostMock.mock.calls[1][1] as FormData;
    expect(secondFormData.get('documentType')).toBe('cliente_outro_02');
  });

  it('mostra Enviando durante o POST pendente e restaura a matriz após sucesso ou erro', async () => {
    const documents: Array<Record<string, unknown>> = [];
    const contract = {
      id: 'contract-upload-feedback-1',
      status: 'AWAITING_DOCS',
      negotiationId: 'neg-upload-feedback-1',
      propertyId: 702,
      propertyCode: 'RV-702',
      propertyTitle: 'Casa Feedback Upload',
      propertyPurpose: 'Venda',
      capturingBrokerName: 'Captador',
      sellingBrokerName: 'Vendedor',
      sellerApprovalStatus: 'PENDING',
      buyerApprovalStatus: 'PENDING',
      sellerInfo: {},
      buyerInfo: {},
      documentRequirements: {
        seller: [
          { category: 'identidade', applicability: 'required' },
          { category: 'comprovante_endereco', applicability: 'required' },
        ],
        buyer: [{ category: 'conjuge_documentos', applicability: 'not_applicable' }],
      },
      documents,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    };
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('/admin/contracts?status=AWAITING_DOCS')) {
        return { data: [contract], total: 1 };
      }
      if (endpoint.includes('/contracts/contract-upload-feedback-1')) {
        return { contract, documents };
      }
      return { data: [], total: 0 };
    });

    const pendingPosts: Array<{
      form: FormData;
      resolve: () => void;
      reject: (error: unknown) => void;
    }> = [];
    apiClientPostMock.mockImplementation(async (_endpoint: string, form: FormData) =>
      new Promise<void>((resolve, reject) => {
        pendingPosts.push({ form, resolve, reject });
      })
    );

    const { container } = render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Analisar Documentação' }));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const uploadButtons = screen.getAllByRole('button', { name: 'Enviar' });
    expect(uploadButtons).toHaveLength(2);

    await fireEvent.click(uploadButtons[0]);
    await fireEvent.change(input, {
      target: { files: [new File(['identidade'], 'identidade.pdf', { type: 'application/pdf' })] },
    });
    await tick();

    expect(pendingPosts).toHaveLength(1);
    expect(pendingPosts[0].form.get('documentType')).toBe('doc_identidade');
    const sendingButton = screen.queryByRole('button', { name: 'Enviando…' });
    const displayedDuringPendingSuccess = sendingButton != null;
    const disabledDuringPendingSuccess = sendingButton?.disabled ?? false;
    expect(uploadButtons[1]).toBeEnabled();
    await fireEvent.click(sendingButton ?? uploadButtons[0]);
    expect(pendingPosts).toHaveLength(1);

    documents.push({
      id: 801,
      documentType: 'doc_identidade',
      documentCategory: 'identidade',
      side: 'seller',
      status: 'PENDING',
      originalFileName: 'identidade.pdf',
    });
    pendingPosts[0].resolve();
    await waitFor(() => expect(screen.getByText('identidade.pdf')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Enviando…' })).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await fireEvent.change(input, {
      target: { files: [new File(['endereço'], 'endereco.pdf', { type: 'application/pdf' })] },
    });
    await tick();

    expect(pendingPosts).toHaveLength(2);
    const displayedDuringPendingError = screen.queryByRole('button', { name: 'Enviando…' });
    const disabledDuringPendingError = displayedDuringPendingError?.disabled ?? false;
    pendingPosts[1].reject({ response: { data: { error: 'Falha de upload simulada.' } } });
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Falha de upload simulada.'));
    expect(screen.queryByRole('button', { name: 'Enviando…' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
    expect({
      success: { visible: displayedDuringPendingSuccess, disabled: disabledDuringPendingSuccess },
      error: { visible: displayedDuringPendingError != null, disabled: disabledDuringPendingError },
    }).toEqual({
      success: { visible: true, disabled: true },
      error: { visible: true, disabled: true },
    });
  });

  it('mostra Atualizando ao recarregar o contrato selecionado e limpa em sucesso ou erro', async () => {
    const contract = {
      id: 'contract-selected-refresh-1',
      status: 'AWAITING_DOCS',
      negotiationId: 'neg-selected-refresh-1',
      propertyId: 703,
      propertyCode: 'RV-703',
      propertyTitle: 'Casa Atualização',
      propertyPurpose: 'Venda',
      sellerApprovalStatus: 'PENDING',
      buyerApprovalStatus: 'PENDING',
      sellerInfo: {},
      buyerInfo: {},
      documents: [],
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    };
    let holdSelectedReload = false;
    let shouldRejectSelectedReload = false;
    let resolveSelectedReload: ((value: unknown) => void) | null = null;
    let rejectSelectedReload: ((error: unknown) => void) | null = null;
    let selectedDetailRequests = 0;
    apiGetMock.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/admin/contracts?status=AWAITING_DOCS')) return { data: [contract], total: 1 };
      if (endpoint.includes('/document-rejections')) return { rejections: [] };
      if (endpoint.includes('/contracts/contract-selected-refresh-1')) {
        selectedDetailRequests += 1;
        if (holdSelectedReload) {
          return new Promise((resolve, reject) => {
            resolveSelectedReload = resolve;
            rejectSelectedReload = shouldRejectSelectedReload ? reject : resolve;
          });
        }
        return { contract, documents: [] };
      }
      return { data: [], total: 0 };
    });

    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Analisar Documentação' }));
    const dialog = screen.getByRole('dialog', { name: 'Análise de Documentação' });
    const updateButton = within(dialog).getByRole('button', { name: 'Atualizar' });

    holdSelectedReload = true;
    await fireEvent.click(updateButton);
    await tick();
    const updatingButton = within(dialog).getByRole('button', { name: 'Atualizando…' });
    expect(updatingButton).toBeDisabled();
    const requestsDuringPendingSuccess = selectedDetailRequests;
    await fireEvent.click(updatingButton);
    expect(selectedDetailRequests).toBe(requestsDuringPendingSuccess);

    resolveSelectedReload?.({ contract: { ...contract, propertyTitle: 'Casa Atualizada' }, documents: [] });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Atualizar' })).toBeEnabled());
    expect(screen.getByText('Casa Atualizada')).toBeInTheDocument();

    shouldRejectSelectedReload = true;
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Atualizar' }));
    await tick();
    expect(within(dialog).getByRole('button', { name: 'Atualizando…' })).toBeDisabled();
    rejectSelectedReload?.(new Error('Falha de atualização simulada.'));
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Não foi possível atualizar o contrato.'));
    expect(within(dialog).getByRole('button', { name: 'Atualizar' })).toBeEnabled();
  });

  it('mostra Reiniciando durante a confirmação de reinício', async () => {
    const contract = {
      id: 'contract-restart-loading-1', status: 'AWAITING_DOCS', negotiationId: 'neg-restart-loading-1', propertyId: 704,
      propertyCode: 'RV-704', propertyTitle: 'Casa Reiniciar', propertyPurpose: 'Venda',
      sellerApprovalStatus: 'APPROVED', buyerApprovalStatus: 'PENDING', sellerInfo: {}, buyerInfo: {}, documents: [],
      createdAt: '2026-03-01T10:00:00.000Z', updatedAt: '2026-03-01T10:00:00.000Z',
    };
    let resolveRestart: (() => void) | null = null;
    apiGetMock.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/admin/contracts?status=AWAITING_DOCS')) return { data: [contract], total: 1 };
      if (endpoint.includes('/document-rejections')) return { rejections: [] };
      if (endpoint.includes('/contracts/contract-restart-loading-1')) return { contract, documents: [] };
      return { data: [], total: 0 };
    });
    apiPutMock.mockImplementation(() => new Promise<void>((resolve) => { resolveRestart = resolve; }));

    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Analisar Documentação' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    const restartDialog = screen.getByText('Reiniciar análise?').closest('[role="dialog"]') as HTMLElement;
    expect(restartDialog).not.toBeNull();
    await fireEvent.click(within(restartDialog).getByRole('button', { name: 'Reiniciar', exact: true }));
    await tick();
    expect(within(restartDialog).getByRole('button', { name: 'Reiniciando…' })).toBeDisabled();
    expect(within(restartDialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    resolveRestart?.();
    await waitFor(() => expect(screen.queryByText('Reiniciar análise?')).not.toBeInTheDocument());
  });

  it('mostra Reabrindo durante a confirmação de reabertura documental', async () => {
    const contract = {
      id: 'contract-reopen-loading-1', status: 'AWAITING_DOCS', negotiationId: 'neg-reopen-loading-1', propertyId: 705,
      propertyCode: 'RV-705', propertyTitle: 'Casa Reabrir', propertyPurpose: 'Venda',
      sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING', sellerInfo: {}, buyerInfo: {},
      documentRequirements: { seller: [{ category: 'identidade', applicability: 'required' }], buyer: [] },
      documents: [{ id: 90, documentType: 'doc_identidade', side: 'seller', status: 'APPROVED', originalFileName: 'identidade.pdf' }],
      createdAt: '2026-03-01T10:00:00.000Z', updatedAt: '2026-03-01T10:00:00.000Z',
    };
    let resolveReopen: (() => void) | null = null;
    apiGetMock.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/admin/contracts?status=AWAITING_DOCS')) return { data: [contract], total: 1 };
      if (endpoint.includes('/document-rejections')) return { rejections: [] };
      if (endpoint.includes('/contracts/contract-reopen-loading-1')) return { contract, documents: contract.documents };
      return { data: [], total: 0 };
    });
    apiPutMock.mockImplementation(() => new Promise<void>((resolve) => { resolveReopen = resolve; }));

    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Analisar Documentação' }));
    await fireEvent.click(screen.getByLabelText('Reabrir análise'));
    const reopenDialog = screen.getByText('Reabrir análise?').closest('[role="dialog"]') as HTMLElement;
    expect(reopenDialog).not.toBeNull();
    await fireEvent.click(within(reopenDialog).getByRole('button', { name: 'Reabrir análise', exact: true }));
    await tick();
    expect(within(reopenDialog).getByRole('button', { name: 'Reabrindo…' })).toBeDisabled();
    expect(within(reopenDialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    resolveReopen?.();
    await waitFor(() => expect(screen.queryByText('Reabrir análise?')).not.toBeInTheDocument());
  });

  it('mostra o loading da decisão do lado e bloqueia uma segunda mutação do mesmo lado', async () => {
    const completeSellerInfo = { nome: 'Vendedor', cpf: '111', estado_civil: 'Solteiro', profissao: 'Corretor', email: 'seller@test.com', telefone: '62999999999', dados_bancarios: 'Banco' };
    const completeBuyerInfo = { nome: 'Comprador', cpf: '222', estado_civil: 'Solteiro', profissao: 'Cliente', email: 'buyer@test.com', telefone: '62999999998' };
    const contract = {
      id: 'contract-side-loading-1', status: 'AWAITING_DOCS', negotiationId: 'neg-side-loading-1', propertyId: 706,
      propertyCode: 'RV-706', propertyTitle: 'Casa Decisão', propertyPurpose: 'Venda',
      sellerApprovalStatus: 'PENDING', buyerApprovalStatus: 'PENDING', sellerInfo: completeSellerInfo, buyerInfo: completeBuyerInfo,
      documentRequirements: { seller: [{ category: 'outro', applicability: 'optional' }], buyer: [{ category: 'outro', applicability: 'optional' }] },
      documents: [], createdAt: '2026-03-01T10:00:00.000Z', updatedAt: '2026-03-01T10:00:00.000Z',
    };
    const pendingSideRequests: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];
    apiGetMock.mockImplementation((endpoint: string) => {
      if (endpoint.includes('/admin/contracts?status=AWAITING_DOCS')) return { data: [contract], total: 1 };
      if (endpoint.includes('/document-rejections')) return { rejections: [] };
      if (endpoint.includes('/contracts/contract-side-loading-1')) return { contract, documents: [] };
      return { data: [], total: 0 };
    });
    apiPutMock.mockImplementation(() => new Promise<void>((resolve, reject) => pendingSideRequests.push({ resolve, reject })));
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Motivo válido.');

    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Analisar Documentação' }));
    await fireEvent.click(screen.getByRole('button', { name: /^Aprovarvendedor$/i }));
    await tick();
    expect(screen.getByRole('button', { name: 'Aprovando…' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Rejeitar' })[0]).toBeDisabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Aprovando…' }));
    expect(pendingSideRequests).toHaveLength(1);
    pendingSideRequests[0].resolve();
    await waitFor(() => expect(screen.getByRole('button', { name: /^Aprovarvendedor$/i })).toBeEnabled());

    await fireEvent.click(screen.getByRole('button', { name: /^Aprovar com observaçãovendedor$/i }));
    await tick();
    expect(screen.getByRole('button', { name: 'Aprovando…' })).toBeDisabled();
    expect(pendingSideRequests).toHaveLength(2);
    pendingSideRequests[1].resolve();
    await waitFor(() => expect(screen.getByRole('button', { name: /^Aprovar com observaçãovendedor$/i })).toBeEnabled());

    await fireEvent.click(screen.getAllByRole('button', { name: 'Rejeitar' })[0]);
    await tick();
    expect(screen.getByRole('button', { name: 'Rejeitando…' })).toBeDisabled();
    expect(pendingSideRequests).toHaveLength(3);
    pendingSideRequests[2].reject(new Error('Falha de rejeição simulada.'));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Rejeitar' })[0]).toBeEnabled());
    expect(toastErrorMock).toHaveBeenCalledWith('Não foi possível registrar a avaliação.');
    promptSpy.mockRestore();
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
      screen.getByRole('button', { name: /^Aprovar com observaçãoanunciante$/i }),
      screen.getByRole('button', { name: /^Aprovar com observaçãocomprador$/i }),
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
      screen.getByRole('button', { name: /^Aprovar com observaçãoanunciante$/i }),
      screen.getByRole('button', { name: /^Aprovar com observaçãocomprador$/i }),
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

    expect(screen.getAllByRole('button', { name: 'Prosseguir com a mesma minuta' })).toHaveLength(2);

    await fireEvent.click(screen.getAllByRole('button', { name: 'Prosseguir com a mesma minuta' })[0]);

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
    expect(screen.getByText('Minuta atual')).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma minuta anexada/)).toBeInTheDocument();
    expect(screen.getByText('Nenhum arquivo selecionado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Prosseguir com a mesma minuta' })).not.toBeInTheDocument();

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
    // A minuta e anexada pelo administrador, portanto nao pertence ao lado comprador/vendedor.
    expect(form.get('side')).toBeNull();
    expect(form.get('file')).toBeInstanceOf(File);
    expect((form.get('file') as File).name).toBe('minuta.pdf');
  });

  it('rejects a non-PDF draft before sending it to the API', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=IN_DRAFT')) {
        return {
          data: [{
            id: 'contract-test-draft-pdf-only-1',
            status: 'IN_DRAFT',
            negotiationId: 'neg-test-draft-pdf-only-1',
            propertyId: 614,
            propertyTitle: 'Casa PDF',
            propertyPurpose: 'Venda',
            documents: [],
          }],
          total: 1,
        };
      }
      return { data: [], total: 0 };
    });

    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Em Confecção' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Anexar Minuta' }));

    const draftFileInput = document.querySelector('#draft-pdf') as HTMLInputElement;
    expect(draftFileInput.accept).toBe('application/pdf,.pdf');
    await fireEvent.change(draftFileInput, {
      target: { files: [new File(['image'], 'minuta.png', { type: 'image/png' })] },
    });

    expect(toastErrorMock).toHaveBeenCalledWith('Selecione um arquivo PDF para a minuta.');
    expect(apiClientPostMock).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: 'Anexar Minuta' }).at(-1)).toBeDisabled();
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

    expect(screen.getByRole('heading', { name: 'Anexar Minuta' })).toBeInTheDocument();
    expect(
      await screen.findByText('Minuta atual')
    ).toBeInTheDocument();
    expect(screen.getAllByText('minuta_atual.pdf').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Trocar minuta' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Prosseguir com a mesma minuta' })).toHaveLength(2);
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

  it('acompanha a revisão da minuta sem repetir o formulário de publicação', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_MINUTE_REVIEW')) {
        return {
          data: [
            {
              id: 'contract-test-draft-review-1',
              status: 'AWAITING_MINUTE_REVIEW',
              negotiationId: 'neg-test-draft-review-1',
              propertyId: 615,
              propertyCode: 'AL-615',
              propertyTitle: 'Casa em Revisão',
              propertyPurpose: 'Aluguel',
              dealType: 'rent',
              documents: [
                {
                  id: 6151,
                  documentType: 'contrato_minuta',
                  originalFileName: 'minuta_revisao.pdf',
                  downloadUrl: '/negotiations/neg-test-draft-review-1/documents/6151/download',
                  metadata: { contractId: 'contract-test-draft-review-1' },
                  createdAt: '2026-03-01T09:00:00.000Z',
                },
              ],
              draftReview: {
                buyerDecision: 'CONSENTED',
                sellerDecision: null,
              },
            },
          ],
          total: 1,
        };
      }
      return { data: [], total: 0 };
    });

    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Conferência da Minuta' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Conferir Minuta' }));

    expect(screen.getByRole('heading', { name: 'Revisão da Minuta' })).toBeInTheDocument();
    expect(screen.getByText('Minuta atual')).toBeInTheDocument();
    expect(screen.getByText('Revisão pelas partes')).toBeInTheDocument();
    expect(screen.getAllByText('minuta_revisao.pdf').length).toBeGreaterThan(0);
    expect(screen.getByText('Locatário: De acordo')).toBeInTheDocument();
    expect(screen.getByText('Locador: Aguardando')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Visualizar' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Baixar' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Substituir minuta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Prosseguir com a mesma minuta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir minuta' })).not.toBeInTheDocument();
    expect(screen.queryByText('Minuta anexada')).not.toBeInTheDocument();
    expect(screen.queryByText(/Nenhum arquivo escolhido/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Selecione um arquivo apenas se quiser substituir a minuta atual.')).not.toBeInTheDocument();
  });

  it('substitui a minuta durante a revisão pelo fluxo de upload existente', async () => {
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_MINUTE_REVIEW')) {
        return {
          data: [
            {
              id: 'contract-test-draft-review-replace-1',
              status: 'AWAITING_MINUTE_REVIEW',
              negotiationId: 'neg-test-draft-review-replace-1',
              propertyId: 616,
              propertyTitle: 'Casa Corrigida',
              propertyPurpose: 'Venda',
              documents: [
                {
                  id: 6161,
                  documentType: 'contrato_minuta',
                  originalFileName: 'minuta_antiga.pdf',
                  downloadUrl: '/negotiations/neg-test-draft-review-replace-1/documents/6161/download',
                  metadata: { contractId: 'contract-test-draft-review-replace-1' },
                },
              ],
              draftReview: {},
            },
          ],
          total: 1,
        };
      }
      return { data: [], total: 0 };
    });
    let resolveDraftUpload: ((value: { data: Record<string, never> }) => void) | undefined;
    apiClientPostMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDraftUpload = resolve;
        })
    );

    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Conferência da Minuta' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Conferir Minuta' }));

    const draftFileInput = document.querySelector('#draft-pdf') as HTMLInputElement;
    const pickerClickSpy = vi.spyOn(draftFileInput, 'click');
    await fireEvent.click(screen.getByRole('button', { name: 'Substituir minuta' }));
    expect(pickerClickSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Comprador: Aguardando')).toBeInTheDocument();
    expect(screen.getByText('Vendedor: Aguardando')).toBeInTheDocument();

    await fireEvent.change(draftFileInput, {
      target: {
        files: [new File(['%PDF-1.4 replacement%'], 'minuta_corrigida.pdf', {
          type: 'application/pdf',
        })],
      },
    });

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledWith(
        '/admin/contracts/contract-test-draft-review-replace-1/draft',
        expect.any(FormData)
      );
    });
    expect(screen.getByRole('button', { name: 'Substituindo…' })).toBeDisabled();
    expect(apiClientPostMock).toHaveBeenCalledTimes(1);

    const form = apiClientPostMock.mock.calls[0][1] as FormData;
    expect((form.get('file') as File).name).toBe('minuta_corrigida.pdf');
    expect(form.get('reuseCurrentDraft')).toBeNull();
    resolveDraftUpload?.({ data: {} });
  });

  it('destaca correção pendente, preserva o motivo textual e pede confirmação antes de substituir', async () => {
    const correctionReason = `texto <b>literal</b>
${'x'.repeat(4979)}`;
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_MINUTE_REVIEW')) {
        return {
          data: [{
            id: 'contract-change-request-1',
            status: 'AWAITING_MINUTE_REVIEW',
            negotiationId: 'neg-change-request-1',
            propertyId: 617,
            propertyTitle: 'Casa com correção',
            propertyPurpose: 'Aluguel',
            dealType: 'rent',
            documents: [{
              id: 6171,
              documentType: 'contrato_minuta',
              originalFileName: 'minuta_corrigir.pdf',
              metadata: { contractId: 'contract-change-request-1' },
            }],
            draftReview: {
              buyerDecision: 'CONSENTED',
              sellerDecision: 'CHANGES_REQUESTED',
              sellerChangeRequest: {
                id: 911,
                reviewerSide: 'seller',
                reason: correctionReason,
                requestedAt: '2026-10-05T10:30:00.000Z',
                pendingResolution: true,
              },
            },
          }],
          total: 1,
        };
      }
      return { data: [], total: 0 };
    });

    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Conferência da Minuta' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Conferir Minuta' }));

    expect(screen.getByText('Correção solicitada')).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === 'Solicitado por: Locador')).toBeInTheDocument();
    const reasonPreview = screen.getByText((_, node) => node?.textContent === correctionReason);
    expect(reasonPreview).not.toHaveClass('line-clamp-3');
    expect(reasonPreview).toHaveClass('max-h-32');
    expect(reasonPreview).toHaveClass('overflow-y-auto');
    expect(reasonPreview).toHaveClass('whitespace-pre-wrap');
    expect(reasonPreview).toHaveClass('break-words');
    expect(reasonPreview.parentElement).not.toHaveClass('bg-amber-50');
    expect(reasonPreview.parentElement).toHaveClass('bg-white');
    expect(screen.queryByText('literal', { selector: 'b' })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Ver motivo completo' }));
    expect(
      screen.getByRole('heading', { name: 'Motivo da solicitação de correção' })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText((_, node) => node?.textContent === correctionReason)
    ).toHaveLength(2);
    expect(screen.queryByText('Locador com ressalvas')).not.toBeInTheDocument();

    const input = document.querySelector('#draft-pdf') as HTMLInputElement;
    const pickerClickSpy = vi.spyOn(input, 'click');
    await fireEvent.click(screen.getByRole('button', { name: 'Substituir minuta' }));
    expect(screen.getByRole('heading', { name: 'Substituir minuta?' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Uma nova versão da minuta será publicada. As decisões atuais de revisão deixam de valer para a nova versão e ambas as partes precisarão conferir novamente.'
      )
    ).toBeInTheDocument();
    expect(pickerClickSpy).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(pickerClickSpy).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Substituir minuta' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Continuar e selecionar arquivo' }));
    expect(pickerClickSpy).toHaveBeenCalledTimes(1);
  });

  it('mantém a minuta com motivo válido, bloqueia duplicidade e atualiza a resolução', async () => {
    const pendingContract = {
      id: 'contract-keep-draft-1',
      status: 'AWAITING_MINUTE_REVIEW',
      negotiationId: 'neg-keep-draft-1',
      propertyId: 618,
      propertyTitle: 'Casa Venda',
      propertyPurpose: 'Venda',
      dealType: 'sale',
      documents: [{
        id: 6181,
        documentType: 'contrato_minuta',
        originalFileName: 'minuta_venda.pdf',
        metadata: { contractId: 'contract-keep-draft-1' },
      }],
      draftReview: {
        buyerDecision: 'CHANGES_REQUESTED',
        sellerDecision: 'CONSENTED',
        buyerChangeRequest: {
          id: 912,
          reviewerSide: 'buyer',
          reason: 'Revisar o prazo de entrega.',
          pendingResolution: true,
        },
      },
    };
    const resolvedContract = {
      ...pendingContract,
      draftReview: {
        ...pendingContract.draftReview,
        buyerChangeRequest: {
          ...pendingContract.draftReview.buyerChangeRequest,
          pendingResolution: false,
          resolution: {
            id: 913,
            resolution: 'KEPT_CURRENT_DRAFT',
            reason: 'O prazo segue a proposta assinada.',
          },
        },
      },
    };
    apiGetMock.mockImplementation(async (endpoint: string) => {
      if (endpoint.includes('status=AWAITING_MINUTE_REVIEW')) {
        return { data: [pendingContract], total: 1 };
      }
      if (endpoint === '/contracts/contract-keep-draft-1') {
        return { data: { contract: resolvedContract, documents: resolvedContract.documents } };
      }
      return { data: [], total: 0 };
    });
    let resolveKeepRequest: ((value: { data: Record<string, never> }) => void) | undefined;
    apiPostMock.mockRejectedValueOnce(new Error('Falha ao manter minuta.')).mockImplementation(
      () => new Promise((resolve) => { resolveKeepRequest = resolve; })
    );

    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Conferência da Minuta' }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Conferir Minuta' }));
    expect(screen.getByText((_, node) => node?.textContent === 'Solicitado por: Comprador')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Manter minuta' }));
    expect(screen.getByRole('heading', { name: 'Manter minuta atual?' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Manter minuta atual?' })).toHaveLength(1);
    expect(
      screen.getByText(
        'A minuta atual será mantida sem substituir o arquivo. Comprador poderá abrir novamente esta mesma minuta e registrar uma nova decisão.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Se a correção solicitada exigir alteração no documento, cancele esta ação e use “Substituir minuta”.'
      )
    ).toBeInTheDocument();
    const reasonField = screen.getByLabelText('Motivo da administração') as HTMLTextAreaElement;
    expect(reasonField.maxLength).toBe(5000);
    await fireEvent.input(reasonField, { target: { value: 'ab' } });
    expect(screen.getAllByRole('button', { name: 'Manter minuta' }).at(-1)).toBeDisabled();
    await fireEvent.input(reasonField, { target: { value: 'x'.repeat(5000) } });
    expect(screen.getByText('5000 / 5000')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Manter minuta' }).at(-1)).not.toBeDisabled();
    await fireEvent.input(reasonField, { target: { value: 'O prazo segue a proposta assinada.' } });
    expect(screen.getByText('34 / 5000')).toBeInTheDocument();

    const confirmButton = screen.getAllByRole('button', { name: 'Manter minuta' }).at(-1);
    if (!confirmButton) throw new Error('Botão de confirmação não encontrado');
    await fireEvent.click(confirmButton);
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    expect(reasonField).not.toBeDisabled();
    expect(reasonField.value).toBe('O prazo segue a proposta assinada.');

    await fireEvent.click(screen.getAllByRole('button', { name: 'Manter minuta' }).at(-1)!);
    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        '/admin/contracts/contract-keep-draft-1/draft-review-requests/912/keep',
        { reason: 'O prazo segue a proposta assinada.' }
      );
    });
    expect(screen.getByRole('button', { name: 'Mantendo…' })).toBeDisabled();
    expect(reasonField).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(apiPostMock).toHaveBeenCalledTimes(2);

    resolveKeepRequest?.({ data: {} });
    await waitFor(() => {
      expect(screen.getByText('Solicitação analisada')).toBeInTheDocument();
    });
    expect(screen.getByText('Minuta mantida')).toBeInTheDocument();
    expect(screen.getByText('O prazo segue a proposta assinada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manter minuta' })).not.toBeInTheDocument();
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
      'Contrato voltou para a conferência da minuta.'
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
    await fireEvent.click(screen.getByRole('button', { name: 'Editar comissões' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Usar reais na comissão captador' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Usar reais na comissão do vendedor' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Usar reais na taxa Encontre Aqui' }));

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

    await fireEvent.click(screen.getByRole('button', { name: 'Salvar edição' }));

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

  it('exibe os nomes do captador e do vendedor na visualização do VGV sem permitir alterá-los', async () => {
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

    expect(screen.queryByLabelText('Nome do captador')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nome do vendedor')).not.toBeInTheDocument();
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
    await fireEvent.click(screen.getByRole('button', { name: 'Editar comissões' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Usar reais na comissão captador' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Usar reais na comissão do vendedor' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Usar reais na taxa Encontre Aqui' }));

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

    await fireEvent.click(screen.getByRole('button', { name: 'Salvar edição' }));
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'A soma das comissões e da taxa Encontre Aqui precisa fechar exatamente 100% do valor base.'
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
    await fireEvent.click(screen.getByRole('button', { name: 'Editar comissões' }));

    await fireEvent.click(
      screen.getByRole('button', { name: 'Usar porcentagem na comissão captador' })
    );
    await fireEvent.click(
      screen.getByRole('button', { name: 'Usar porcentagem na comissão do vendedor' })
    );
    await fireEvent.click(
      screen.getByRole('button', { name: 'Usar porcentagem na taxa Encontre Aqui' })
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
    await fireEvent.click(screen.getByRole('button', { name: 'Salvar edição' }));

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
    await fireEvent.click(screen.getByRole('button', { name: 'Editar comissões' }));

    await fireEvent.click(
      screen.getByRole('button', { name: 'Usar porcentagem na comissão captador' })
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Usar reais na comissão do vendedor' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Usar reais na taxa Encontre Aqui' }));
    await tick();

    const valorInput = screen.getByLabelText('Valor de venda (base da comissão) (R$)') as HTMLInputElement;
    const captadorInput = (await screen.findByLabelText('Comissão Captador')) as HTMLInputElement;
    const vendedorInput = screen.getByLabelText('Comissão do vendedor') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui') as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '1000,00' } });
    await fireEvent.input(captadorInput, { target: { value: '50' } });
    await fireEvent.input(vendedorInput, { target: { value: '250,00' } });
    await fireEvent.input(taxaInput, { target: { value: '250,00' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Salvar edição' }));

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
    await fireEvent.click(screen.getByRole('button', { name: 'Editar comissões' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Usar reais na comissão captador' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Usar reais na comissão do vendedor' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Usar reais na taxa Encontre Aqui' }));

    const valorInput = screen.getByLabelText('Valor de venda (base da comissão) (R$)') as HTMLInputElement;
    const captadorInput = screen.getByLabelText('Comissão Captador') as HTMLInputElement;
    const vendedorInput = screen.getByLabelText('Comissão do vendedor') as HTMLInputElement;
    const taxaInput = screen.getByLabelText('Taxa Encontre Aqui') as HTMLInputElement;

    await fireEvent.input(valorInput, { target: { value: '1000,00' } });
    await fireEvent.input(captadorInput, { target: { value: '500' } });
    await fireEvent.input(vendedorInput, { target: { value: '300' } });
    await fireEvent.input(taxaInput, { target: { value: '200' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Salvar edição' }));

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

    expect(await screen.findByText('Aprovado com observação')).toBeInTheDocument();
    expect(screen.queryByText('Vendedor com ressalvas')).not.toBeInTheDocument();
    expect(screen.queryByText('Comprador com ressalvas')).not.toBeInTheDocument();

    await fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(await screen.findByText('Aprovação com observação')).toBeInTheDocument();
    expect(
      screen.getByText('Atualizar CPF e reenviar certidão na próxima revisão.')
    ).toBeInTheDocument();
  });

  it('mostra somente a badge geral quando há ressalvas em qualquer lado', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'contract-no-remarks',
          status: 'FINALIZED',
          negotiationId: 'neg-no-remarks',
          propertyId: 712,
          propertyTitle: 'Sem Ressalvas',
          propertyPurpose: 'Venda',
          sellerApprovalStatus: 'APPROVED',
          buyerApprovalStatus: 'APPROVED',
          documents: [],
        },
        {
          id: 'contract-seller-remarks',
          status: 'FINALIZED',
          negotiationId: 'neg-seller-remarks',
          propertyId: 713,
          propertyTitle: 'Ressalva Vendedor',
          propertyPurpose: 'Venda',
          sellerApprovalStatus: 'APPROVED_WITH_RES',
          buyerApprovalStatus: 'APPROVED',
          sellerApprovalReason: { reason: 'Ajuste do vendedor.' },
          documents: [],
        },
        {
          id: 'contract-buyer-remarks',
          status: 'FINALIZED',
          negotiationId: 'neg-buyer-remarks',
          propertyId: 714,
          propertyTitle: 'Ressalva Comprador',
          propertyPurpose: 'Venda',
          sellerApprovalStatus: 'APPROVED',
          buyerApprovalStatus: 'APPROVED_WITH_RES',
          buyerApprovalReason: { reason: 'Ajuste do comprador.' },
          documents: [],
        },
        {
          id: 'contract-both-remarks',
          status: 'FINALIZED',
          negotiationId: 'neg-both-remarks',
          propertyId: 715,
          propertyTitle: 'Ressalvas de Ambos',
          propertyPurpose: 'Venda',
          sellerApprovalStatus: 'APPROVED_WITH_RES',
          buyerApprovalStatus: 'APPROVED_WITH_RES',
          sellerApprovalReason: { reason: 'Ajuste do vendedor.' },
          buyerApprovalReason: { reason: 'Ajuste do comprador.' },
          documents: [],
        },
      ],
      total: 4,
    });

    render(ContractsModule);
    await fireEvent.click(await screen.findByRole('button', { name: 'Finalizados' }));

    const rowFor = (propertyTitle: string) => {
      const row = screen
        .getAllByRole('row')
        .find((candidate) => candidate.textContent?.includes(propertyTitle));
      if (!row) throw new Error(`Row not found for ${propertyTitle}`);
      return row;
    };

    expect(within(rowFor('Sem Ressalvas')).queryByText('Aprovado com observação')).not.toBeInTheDocument();
    expect(within(rowFor('Ressalva Vendedor')).getByText('Aprovado com observação')).toBeInTheDocument();
    expect(within(rowFor('Ressalva Comprador')).getByText('Aprovado com observação')).toBeInTheDocument();
    expect(within(rowFor('Ressalvas de Ambos')).getByText('Aprovado com observação')).toBeInTheDocument();
    expect(screen.queryByText(/(Vendedor|Comprador|Locador|Locatário) com ressalvas/)).not.toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: /^Aprovar com observaçãoanunciante$/i })).not.toBeInTheDocument();

    const callsBeforeRestart = apiPutMock.mock.calls.length;
    await fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(screen.getByText('Reiniciar análise?')).toBeInTheDocument();
    expect(apiPutMock).toHaveBeenCalledTimes(callsBeforeRestart);
    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(apiPutMock).toHaveBeenCalledTimes(callsBeforeRestart);

    await fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reiniciar', exact: true }));
    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        '/admin/contracts/contract-test-side-1/evaluate-side',
        { side: 'seller', status: 'PENDING', reason: undefined }
      );
    });
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
      name: /^Aprovar com observaçãoanunciante$/i,
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
    expect(screen.getByText('Aprovado com observação')).toBeInTheDocument();
  });
});
