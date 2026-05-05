import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPutMock,
  apiPatchMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiPatchMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('$lib/apiClient', () => ({
  api: {
    get: apiGetMock,
    put: apiPutMock,
    patch: apiPatchMock,
  },
  apiClient: {
    put: apiPutMock,
    patch: apiPatchMock,
  },
}));

vi.mock('svelte-sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

import PropertyManagement from '../../src/lib/PropertyManagement.svelte';
import { authToken } from '../../src/lib/store';

type PropertyMockState = {
  id: number;
  title: string;
  description: string;
  status: 'approved' | 'pending_approval' | 'sold' | 'rented';
  request_type?: 'creation' | 'edit' | null;
  public_code: string | null;
  public_id: number | null;
  purpose: string | null;
  type: string;
  city: string | null;
  state: string | null;
  bairro: string | null;
  address: string | null;
  numero: string | null;
  cep: string | null;
  sem_numero: number | boolean | null;
  sem_quadra: number | boolean | null;
  sem_lote: number | boolean | null;
  quadra: string | null;
  lote: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  broker_name: string | null;
  broker_phone: string | null;
  sem_cep: number | boolean | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garage_spots: number | null;
  area_construida_valor: number | null;
  area_terreno_valor: number | null;
  area_construida_unidade: 'm2' | 'hectare' | 'alqueire';
  area_terreno_unidade: 'm2' | 'hectare' | 'alqueire';
  area_construida_m2: number | null;
  area_terreno_m2: number | null;
  amenities: string[];
  has_wifi: boolean | null;
  tem_piscina: boolean | null;
  tem_energia_solar: boolean | null;
  tem_automacao: boolean | null;
  tem_ar_condicionado: boolean | null;
  eh_mobiliada: boolean | null;
  price: number;
  images: null;
};

type SavePayload = Record<string, unknown>;

const createCityResponse = () => [
  {
    nome: 'Anápolis',
    uf: 'GO',
  },
];

const basePropertyState: PropertyMockState = {
  id: 501,
  title: 'Casa Horizonte',
  description: 'Descrição original',
  status: 'approved',
  request_type: null,
  public_code: 'PUB-501',
  public_id: 501,
  purpose: 'Venda',
  type: 'Casa',
  city: 'Anápolis',
  state: 'GO',
  bairro: 'Centro',
  address: 'Rua Azul',
  numero: '120',
  cep: '75000-000',
  sem_numero: 0,
  sem_quadra: 0,
  sem_lote: 0,
  quadra: 'Q1',
  lote: '10',
  owner_name: 'João da Casa',
  owner_phone: '62999990000',
  broker_name: 'Corretora Teste',
  broker_phone: '62988881111',
  sem_cep: 0,
  bedrooms: 2,
  bathrooms: 1,
  garage_spots: 1,
  area_construida_valor: 120,
  area_terreno_valor: 300,
  area_construida_unidade: 'm2',
  area_terreno_unidade: 'm2',
  area_construida_m2: 120,
  area_terreno_m2: 300,
  amenities: ['Poço Artesiano'],
  has_wifi: false,
  tem_piscina: false,
  tem_energia_solar: false,
  tem_automacao: false,
  tem_ar_condicionado: false,
  eh_mobiliada: false,
  price: 450000,
  images: null,
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildPropertySummary(property: PropertyMockState): Record<string, unknown> {
  return {
    id: property.id,
    title: property.title,
    description: property.description,
    status: property.status,
    request_type: property.request_type ?? null,
    public_code: property.public_code,
    public_id: property.public_id,
    purpose: property.purpose,
    type: property.type,
    city: property.city,
    state: property.state,
    bairro: property.bairro,
    address: property.address,
    numero: property.numero,
    bairro_optional: null,
    cep: property.cep,
    owner_name: property.owner_name,
    owner_phone: property.owner_phone,
    broker_name: property.broker_name,
    broker_phone: property.broker_phone,
    sem_numero: property.sem_numero,
    sem_quadra: property.sem_quadra,
    sem_lote: property.sem_lote,
    quadra: property.quadra,
    lote: property.lote,
    sem_cep: property.sem_cep,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    garage_spots: property.garage_spots,
    area_construida_valor: property.area_construida_valor,
    area_terreno_valor: property.area_terreno_valor,
    area_construida_m2: property.area_construida_m2,
    area_terreno_m2: property.area_terreno_m2,
    area_construida_unidade: property.area_construida_unidade,
    area_terreno_unidade: property.area_terreno_unidade,
    area_construida: property.area_construida_m2,
    area_terreno: property.area_terreno_m2,
    amenities: property.amenities,
    has_wifi: property.has_wifi,
    tem_piscina: property.tem_piscina,
    tem_energia_solar: property.tem_energia_solar,
    tem_automacao: property.tem_automacao,
    tem_ar_condicionado: property.tem_ar_condicionado,
    eh_mobiliada: property.eh_mobiliada,
    price: property.price,
    images: property.images,
  };
}

function mockPropertyManagementRequests({
  initialProperty,
  onSaved,
}: {
  initialProperty: PropertyMockState;
  onSaved?: (payload: SavePayload) => void;
}) {
  let property = clone(initialProperty);

  apiGetMock.mockImplementation(async (endpoint: string) => {
    if (endpoint.includes('/admin/properties-with-brokers')) {
      return {
        data: [buildPropertySummary(property)],
        total: 1,
      };
    }

    if (endpoint.startsWith('/admin/properties/')) {
      return buildPropertySummary(property);
    }

    if (endpoint.startsWith('/admin/users')) {
      return [];
    }

    throw new Error(`Endpoint não esperado no teste: ${endpoint}`);
  });

  apiPutMock.mockImplementation(async (_endpoint: string, payload: SavePayload) => {
    onSaved?.(payload);

    property = {
      ...property,
      description: typeof payload.description === 'string' ? payload.description : property.description,
      bedrooms:
        payload.bedrooms != null ? Number(payload.bedrooms) : property.bedrooms,
      bathrooms:
        payload.bathrooms != null ? Number(payload.bathrooms) : property.bathrooms,
      area_construida_valor:
        payload.area_construida_valor != null
          ? Number(payload.area_construida_valor)
          : property.area_construida_valor,
      area_construida_unidade:
        typeof payload.area_construida_unidade === 'string'
          ? (payload.area_construida_unidade as PropertyMockState['area_construida_unidade'])
          : property.area_construida_unidade,
      area_terreno_valor:
        payload.area_terreno_valor != null
          ? Number(payload.area_terreno_valor)
          : property.area_terreno_valor,
      area_terreno_unidade:
        typeof payload.area_terreno_unidade === 'string'
          ? (payload.area_terreno_unidade as PropertyMockState['area_terreno_unidade'])
          : property.area_terreno_unidade,
      amenities: Array.isArray(payload.amenities) ? (payload.amenities as string[]) : property.amenities,
    };

    return {};
  });

  apiPatchMock.mockResolvedValue({});
}

function getRevisarButtons() {
  return screen.getAllByRole('button', { name: 'Revisar' });
}

function findListItemByLabel(container: HTMLElement, label: string): HTMLElement | null {
  const listItems = within(container).getAllByRole('listitem');
  return listItems.find((item) => item.textContent?.includes(label)) ?? null;
}

function findAmenityPill(container: HTMLElement, label: string): HTMLElement {
  return within(container).getByText((content, element) => {
    return element?.tagName === 'SPAN' && String(content).includes(label);
  });
}

describe('PropertyManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authToken.set('token-de-teste');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn(async () => ''),
      json: vi.fn(async () => createCityResponse()),
    }));
  });

  afterEach(() => {
    authToken.set(null);
    vi.unstubAllGlobals();
  });

  it('salva edição normal e reapresenta texto, área, quartos e amenities persistidos', async () => {
    let lastPayload: SavePayload = {};
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'approved',
        request_type: null,
      },
      onSaved: (payload) => {
        lastPayload = payload;
      },
    });

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    const firstRevisar = getRevisarButtons()[0];
    await fireEvent.click(firstRevisar);

    const dialog = await screen.findByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));

    await fireEvent.input(
      within(dialog).getByPlaceholderText('Descricao do imóvel'),
      { target: { value: 'Nova descrição salva com sucesso' } }
    );
    const bedroomsInput = dialog.querySelector('input[name="bedrooms"]');
    expect(bedroomsInput).toBeTruthy();
    await fireEvent.input(bedroomsInput as HTMLInputElement, { target: { value: '4' } });
    const areaConstruidaInput = dialog.querySelector('input[name="area_construida_valor"]');
    expect(areaConstruidaInput).toBeTruthy();
    await fireEvent.input(areaConstruidaInput as HTMLInputElement, { target: { value: '2332' } });
    const areaConstruidaUnidade = dialog.querySelector('select[name="area_construida_unidade"]');
    expect(areaConstruidaUnidade).toBeTruthy();
    await fireEvent.change(areaConstruidaUnidade as HTMLSelectElement, { target: { value: 'hectare' } });
    const areaTerrenoInput = dialog.querySelector('input[name="area_terreno_valor"]');
    expect(areaTerrenoInput).toBeTruthy();
    await fireEvent.input(
      areaTerrenoInput as HTMLInputElement,
      { target: { value: '1500' } }
    );
    const areaTerrenoUnidade = dialog.querySelector('select[name="area_terreno_unidade"]');
    expect(areaTerrenoUnidade).toBeTruthy();
    await fireEvent.change(areaTerrenoUnidade as HTMLSelectElement, { target: { value: 'm2' } });
    await fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Mobiliada' }));
    await fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Academia' }));

    await fireEvent.click(within(dialog).getAllByRole('button', { name: 'Salvar' })[0]);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    const [, putPayload] = apiPutMock.mock.calls[0] as [string, SavePayload];
    expect(putPayload).toMatchObject({
      title: 'Casa Horizonte',
      description: 'Nova descrição salva com sucesso',
      bedrooms: 4,
      area_construida_valor: 2332,
      area_construida_unidade: 'hectare',
      area_terreno_valor: 1500,
      area_terreno_unidade: 'm2',
    });
    expect(putPayload).toMatchObject({ status: 'approved' });
    expect(putPayload.amenities).toEqual(expect.arrayContaining(['Mobiliada', 'Academia']));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Imóvel atualizado com sucesso.');
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await fireEvent.click(getRevisarButtons()[0]);
    const reopenedDialog = await screen.findByRole('dialog');

    expect(await within(reopenedDialog).findByText('Nova descrição salva com sucesso')).toBeInTheDocument();
    expect(findListItemByLabel(reopenedDialog, 'Quartos')).toHaveTextContent('4');
    expect(findListItemByLabel(reopenedDialog, 'Área construída')).toHaveTextContent('2332 ha');
    expect(findAmenityPill(reopenedDialog, 'Mobiliada')).toHaveTextContent('Sim');
    expect(findAmenityPill(reopenedDialog, 'Academia')).toHaveTextContent('Sim');
    expect(lastPayload).toBe(putPayload);
  });

  it('salva solicitação de edição com public_code e não envia status inválido no PUT', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'pending_approval',
        request_type: 'edit',
        public_code: 'PUB-PEND-01',
      },
    });

    render(PropertyManagement, {
      initialStatus: 'pending_approval',
      allowApproval: true,
    });

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    await fireEvent.click(getRevisarButtons()[0]);

    const dialog = await screen.findByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));
    await fireEvent.input(
      within(dialog).getByPlaceholderText('Descricao do imóvel'),
      { target: { value: 'Correção de solicitação pendente' } }
    );
    const requestAreaInput = dialog.querySelector('input[name="area_construida_valor"]');
    expect(requestAreaInput).toBeTruthy();
    await fireEvent.input(requestAreaInput as HTMLInputElement, { target: { value: '3210' } });
    const requestAreaUnit = dialog.querySelector('select[name="area_construida_unidade"]');
    expect(requestAreaUnit).toBeTruthy();
    await fireEvent.change(requestAreaUnit as HTMLSelectElement, { target: { value: 'hectare' } });
    const requestTerrainInput = dialog.querySelector('input[name="area_terreno_valor"]');
    expect(requestTerrainInput).toBeTruthy();
    await fireEvent.input(requestTerrainInput as HTMLInputElement, { target: { value: '5000' } });
    const requestTerrainUnit = dialog.querySelector('select[name="area_terreno_unidade"]');
    expect(requestTerrainUnit).toBeTruthy();
    await fireEvent.change(requestTerrainUnit as HTMLSelectElement, { target: { value: 'm2' } });
    await fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Mobiliada' }));
    await fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Academia' }));
    await fireEvent.click(within(dialog).getAllByRole('button', { name: 'Salvar' })[0]);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });

    const [, requestPayload] = apiPutMock.mock.calls[0] as [string, SavePayload];
    expect(apiPatchMock).not.toHaveBeenCalled();
    expect(requestPayload).toMatchObject({
      description: 'Correção de solicitação pendente',
      area_construida_valor: 3210,
      area_construida_unidade: 'hectare',
      area_terreno_valor: 5000,
      area_terreno_unidade: 'm2',
    });
    expect(requestPayload).not.toHaveProperty('status');
    expect(requestPayload.amenities).toEqual(expect.arrayContaining(['Mobiliada', 'Academia']));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await fireEvent.click(getRevisarButtons()[0]);
    const reopenedDialog = await screen.findByRole('dialog');
    expect(await within(reopenedDialog).findByText(/Dashboard \/ Imóveis \/ Referência PUB-PEND-01/)).toBeInTheDocument();
    expect(
      within(reopenedDialog)
        .getAllByRole('listitem')
        .some((item) => item.textContent?.includes('PUB-PEND-01'))
    ).toBe(true);
  });
});
