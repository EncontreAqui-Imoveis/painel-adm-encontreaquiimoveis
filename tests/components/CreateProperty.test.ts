import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeAmenityList } from '../../src/lib/propertyAmenities';

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

const ALL_COMMODITIES: string[] = [
  'Wi-Fi',
  'Piscina',
  'Energia solar',
  'Automação',
  'Ar condicionado',
  'Poço artesiano',
  'Mobiliada',
  'Elevador',
  'Academia',
  'Churrasqueira',
  'Salão de festas',
  'Quadra',
  'Condomínio fechado',
  'Aceita pets',
  'Sistema de segurança/câmera',
  'Sauna',
];

describe('CreateProperty', () => {
  it('não converte Planejados legado para Mobiliada', () => {
    expect(normalizeAmenityList(['Planejados'])).toEqual([]);
  });

  it('combina amenities canônicas e flags legadas sem duplicar', () => {
    const normalized = normalizeAmenityList({
      amenities: ['Ar condicionado'],
      has_wifi: true,
      hasPiscina: 1,
      tem_churrasqueira: '1',
      sistema_de_seguranca: 'sim',
      unknownFlag: false,
    });

    expect(normalized).toEqual(
      expect.arrayContaining([
        'Ar condicionado',
        'Wi-Fi',
        'Piscina',
        'Churrasqueira',
        'Sistema de segurança/câmera',
      ])
    );
    expect(normalized).toHaveLength(5);
  });

  async function selectAllAmenities(): Promise<void> {
    for (const amenity of ALL_COMMODITIES) {
      await fireEvent.click(screen.getByRole('checkbox', { name: amenity }));
    }
  }

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
        public_code: 'REFA-321',
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
    await fireEvent.input(getInputById('create-property-area-terreno'), {
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
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Mobiliada' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Academia' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar imóvel' }));

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledWith(
        '/admin/properties',
        expect.objectContaining({
          title: 'Casa teste painel',
          city: 'Rio Verde',
          amenities: expect.arrayContaining(['Mobiliada', 'Academia']),
          area_construida_valor: 145.5,
          area_terreno_valor: 210,
          area_construida_unidade: 'm2',
          area_terreno_unidade: 'm2',
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
      screen.getByText('Imóvel criado com sucesso. Referência pública: #REFA-321.')
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

  it('aceita quartos = 0 via opcao "Sem quarto"', async () => {
    render(CreateProperty);

    await fillRequiredFields();
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Sem quarto' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar imóvel' }));

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledWith(
        '/admin/properties',
        expect.objectContaining({
          area_construida: 145.5,
          area_terreno: 210,
          area_construida_valor: 145.5,
          area_terreno_valor: 210,
          bedrooms: 0,
          bathrooms: 2,
          garage_spots: 2,
        }),
        expect.anything()
      );
    });
  });

  it('envia área construída com unidade personalizada (2332 ha) no payload', async () => {
    render(CreateProperty);

    await fillRequiredFields();
    const areaConstruidaInput = getInputById('create-property-area-construida');
    const areaConstruidaUnidade = getInputById('create-property-area-construida-unidade');
    await fireEvent.input(areaConstruidaInput, { target: { value: '2332' } });
    await fireEvent.change(areaConstruidaUnidade, { target: { value: 'hectare' } });
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Mobiliada' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Academia' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar imóvel' }));

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledWith(
        '/admin/properties',
        expect.objectContaining({
          area_construida_valor: 2332,
          area_construida_unidade: 'hectare',
          area_terreno_valor: 210,
          area_terreno_unidade: 'm2',
          amenities: expect.arrayContaining(['Mobiliada', 'Academia']),
        }),
        expect.anything()
      );
    });
  });

  it('envia área do terreno com unidade personalizada (2332 ha) no payload sem converter', async () => {
    render(CreateProperty);

    await fillRequiredFields();
    const areaTerrenoInput = getInputById('create-property-area-terreno');
    const areaTerrenoUnidade = getInputById('create-property-area-terreno-unidade');
    await fireEvent.input(areaTerrenoInput, { target: { value: '2332' } });
    await fireEvent.change(areaTerrenoUnidade, { target: { value: 'hectare' } });
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Mobiliada' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Academia' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar imóvel' }));

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledWith(
        '/admin/properties',
        expect.objectContaining({
          area_construida_valor: 145.5,
          area_construida_unidade: 'm2',
          area_terreno: 2332,
          area_terreno_valor: 2332,
          area_terreno_unidade: 'hectare',
          amenities: expect.arrayContaining(['Mobiliada', 'Academia']),
        }),
        expect.anything()
      );
    });
  });

  it('envia todas as comodidades disponíveis no payload', async () => {
    render(CreateProperty);

    await fillRequiredFields();
    await selectAllAmenities();
    await fireEvent.click(screen.getByRole('button', { name: 'Cadastrar imóvel' }));

    await waitFor(() => {
      expect(apiClientPostMock).toHaveBeenCalledWith(
        '/admin/properties',
        expect.objectContaining({
          amenities: expect.arrayContaining(ALL_COMMODITIES),
          area_construida_valor: 145.5,
          area_terreno_valor: 210,
          area_construida_unidade: 'm2',
          area_terreno_unidade: 'm2',
        }),
        expect.anything()
      );
    });

    const [, payload] = apiClientPostMock.mock.calls[0] as [string, Record<string, unknown>, any];
    expect(payload.amenities).toHaveLength(ALL_COMMODITIES.length);
  });
});
