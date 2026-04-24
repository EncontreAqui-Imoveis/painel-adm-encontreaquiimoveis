import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPostMock,
  apiPutMock,
  apiClientPostMock,
  uploadMultipartWithProgressMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiClientPostMock: vi.fn(),
  uploadMultipartWithProgressMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
    put: apiPutMock,
  },
  apiClient: {
    post: apiClientPostMock,
  },
}));

vi.mock('$lib/mediaUploadService', () => ({
  uploadMultipartWithProgress: uploadMultipartWithProgressMock,
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
    warning: vi.fn(),
  },
}));

import CreateProperty from '../../src/lib/components/CreateProperty.svelte';

describe('CreateProperty', () => {
  function getInputById(id: string): HTMLInputElement | HTMLSelectElement {
    const element = document.getElementById(id);
    if (!element || !(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) {
      throw new Error(`Elemento não encontrado: ${id}`);
    }
    return element;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue([]);
    apiPostMock.mockResolvedValue({
      apiKey: 'key',
      cloudName: 'demo',
      signature: 'signature',
      timestamp: 123456,
      folder: 'conectimovel/properties/admin',
      maxFileSize: 15 * 1024 * 1024,
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      resourceType: 'image',
      uploadUrl: 'https://api.cloudinary.test/upload',
    });
    uploadMultipartWithProgressMock.mockResolvedValue({
      secure_url:
        'https://res.cloudinary.com/demo/image/upload/v1/conectimovel/properties/admin/foto.jpg',
    });
    apiClientPostMock.mockResolvedValue({
      data: {
        propertyId: 321,
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ nome: 'Rio Verde' }],
      })
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
  });

  async function fillRequiredFields() {
    await fireEvent.input(screen.getByLabelText('Título *'), {
      target: { value: 'Casa teste painel' },
    });
    await fireEvent.input(screen.getByLabelText('Descrição *'), {
      target: { value: 'Descrição completa do imóvel.' },
    });
    await fireEvent.input(screen.getByLabelText('Endereço *'), {
      target: { value: 'Rua das Flores' },
    });
    await fireEvent.input(screen.getByLabelText('Bairro *'), {
      target: { value: 'Centro' },
    });
    await fireEvent.input(screen.getByLabelText('Número *'), {
      target: { value: '10' },
    });
    await fireEvent.input(screen.getByLabelText('Cidade *'), {
      target: { value: 'Rio Verde' },
    });
    await fireEvent.input(getInputById('create-property-quadra'), {
      target: { value: 'Q1' },
    });
    await fireEvent.input(getInputById('create-property-lote'), {
      target: { value: '12' },
    });
    await fireEvent.input(getInputById('create-property-bedrooms'), {
      target: { value: '3' },
    });
    await fireEvent.input(getInputById('create-property-bathrooms'), {
      target: { value: '2' },
    });
    await fireEvent.input(getInputById('create-property-garage-spots'), {
      target: { value: '2' },
    });
    await fireEvent.input(getInputById('create-property-area-construida'), {
      target: { value: '145,5' },
    });
    await fireEvent.input(screen.getByLabelText('Área do terreno (m²) *'), {
      target: { value: '210,0' },
    });
    await fireEvent.input(screen.getByLabelText('Preço de venda *'), {
      target: { value: '350000' },
    });

    const imageInput = screen.getByLabelText('Fotos do imóvel *');
    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });
    await fireEvent.change(imageInput, {
      target: { files: [file] },
    });
  }

  it('cria imóvel, exibe feedback e dispara evento created', async () => {
    render(CreateProperty);

    await fillRequiredFields();
    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar imóvel' }));

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledWith(
        '/admin/properties',
        expect.objectContaining({
          title: 'Casa teste painel',
          city: 'Rio Verde',
          image_urls: [
            'https://res.cloudinary.com/demo/image/upload/v1/conectimovel/properties/admin/foto.jpg',
          ],
        }),
        expect.objectContaining({
          timeout: 420000,
        })
      );
    });
    expect(uploadMultipartWithProgressMock).toHaveBeenCalled();
    const [, formData] = uploadMultipartWithProgressMock.mock.calls[0] as [string, FormData];
    expect(formData.get('max_file_size')).toBeNull();
    expect(formData.get('allowed_formats')).toBe('jpg,jpeg,png,webp');

    expect(toastSuccessMock).toHaveBeenCalledWith('Imóvel criado com sucesso.');
    expect(
      screen.getByText('Imóvel criado com sucesso. Código interno: #321.')
    ).toBeInTheDocument();
  });

  it('superfícies a mensagem específica do backend quando o cadastro falha', async () => {
    apiClientPostMock.mockRejectedValue({
      response: {
        data: {
          error: 'Campo obrigatorio ausente: quadra',
        },
      },
    });

    render(CreateProperty);

    await fillRequiredFields();
    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar imóvel' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Campo obrigatorio ausente: quadra'
      );
    });

    expect(
      screen.getByText('Campo obrigatorio ausente: quadra')
    ).toBeInTheDocument();
  });
});
