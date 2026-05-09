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
  legacyAmenityFlags?: Record<string, unknown>;
  price: number;
  images: Array<Record<string, unknown>> | null;
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
  amenities: ['Poço artesiano'],
  price: 450000,
  images: null,
};

const ALL_AMENITIES_16 = [
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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type Deferred<T = void> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((localResolve, localReject) => {
    resolve = localResolve;
    reject = localReject;
  });

  return { promise, resolve, reject };
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
    ...(property.legacyAmenityFlags ?? {}),
    price: property.price,
    images: property.images,
  };
}

function applyServerPatch(property: PropertyMockState, payload: SavePayload): void {
  if (typeof payload.title === 'string') {
    property.title = payload.title;
  }
  if (typeof payload.description === 'string') {
    property.description = payload.description;
  }
  if ('status' in payload) {
    property.status = String(payload.status ?? property.status) as PropertyMockState['status'];
  }
  if (typeof payload.public_code === 'string') {
    property.public_code = payload.public_code;
  }
  if ('bedrooms' in payload) {
    property.bedrooms = payload.bedrooms == null ? null : Number(payload.bedrooms);
  }
  if ('area_construida_valor' in payload) {
    property.area_construida_valor =
      payload.area_construida_valor == null ? null : Number(payload.area_construida_valor);
  }
  if (typeof payload.area_construida_unidade === 'string') {
    property.area_construida_unidade = payload.area_construida_unidade as PropertyMockState['area_construida_unidade'];
  }
  if ('area_terreno_valor' in payload) {
    property.area_terreno_valor =
      payload.area_terreno_valor == null ? null : Number(payload.area_terreno_valor);
  }
  if (typeof payload.area_terreno_unidade === 'string') {
    property.area_terreno_unidade = payload.area_terreno_unidade as PropertyMockState['area_terreno_unidade'];
  }
  if (Array.isArray(payload.amenities)) {
    property.amenities = payload.amenities;
  }
  if (typeof payload.area_construida === 'number' && Number.isFinite(payload.area_construida)) {
    property.area_construida_m2 = Number(payload.area_construida);
  }
  if (typeof payload.area_terreno === 'number' && Number.isFinite(payload.area_terreno)) {
    property.area_terreno_m2 = Number(payload.area_terreno);
  }
}

function mockPropertyManagementRequests({
  initialProperty,
}: {
  initialProperty: PropertyMockState;
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
    applyServerPatch(property, payload);
    return {};
  });

  apiPatchMock.mockResolvedValue({});
}

function getPropertiesListCallCount(): number {
  return apiGetMock.mock.calls.filter(([endpoint]) =>
    String(endpoint).includes('/admin/properties-with-brokers')
  ).length;
}

function getRevisarButtons() {
  return screen.getAllByRole('button', { name: 'Revisar' });
}

function findListItemByLabel(container: HTMLElement, label: string): HTMLElement | null {
  const listItems = within(container).getAllByRole('listitem');
  return listItems.find((item) => item.textContent?.includes(label)) ?? null;
}

function getAmenitySection(container: HTMLElement, isActive: boolean): HTMLElement {
  const heading = within(container).getByText(isActive ? 'Ativas' : 'Inativas', { selector: 'p' });
  const section = heading.nextElementSibling;
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Seção ${isActive ? 'ativas' : 'inativas'} não encontrada`);
  }
  return section;
}

function findAmenityInActiveSection(container: HTMLElement, label: string): HTMLElement {
  return within(getAmenitySection(container, true)).getByText((content, element) => {
    return element?.tagName === 'SPAN' && String(content).trim() === label;
  });
}

  async function setAmenityChecked(
    container: HTMLElement,
    amenity: string,
    checked: boolean
  ): Promise<void> {
    const checkbox = within(container).getByRole('checkbox', { name: amenity }) as HTMLInputElement;
    if (checkbox.checked !== checked) {
      await fireEvent.click(checkbox);
    }
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
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'approved',
        request_type: null,
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
    const [putEndpoint, putPayload] = apiPutMock.mock.calls[0] as [string, SavePayload];
    expect(putEndpoint).toBe('/admin/properties/501');
    expect(apiPatchMock).not.toHaveBeenCalled();
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
    expect(putPayload).toHaveProperty('area_construida_valor', 2332);
    expect(putPayload).toHaveProperty('area_terreno_valor', 1500);
    expect(putPayload).toHaveProperty('area_construida_unidade', 'hectare');
    expect(putPayload).toHaveProperty('area_terreno_unidade', 'm2');
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
    expect(findAmenityInActiveSection(reopenedDialog, 'Mobiliada')).toBeInTheDocument();
    expect(findAmenityInActiveSection(reopenedDialog, 'Academia')).toBeInTheDocument();
  });

  it('renderiza smoke legado/canônico e salva remoção e adição de amenities', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'approved',
        request_type: null,
        public_code: 'PUB-HA-001',
        area_construida_valor: 0,
        area_construida_unidade: 'm2',
        area_terreno_valor: 2332,
        area_terreno_unidade: 'hectare',
        area_construida_m2: 0,
        area_terreno_m2: 23320000,
        owner_name: 'Proprietário Teste',
        owner_phone: '61999990000',
        broker_name: 'Corretora Teste',
        broker_phone: '61988881111',
        amenities: ALL_AMENITIES_16,
        legacyAmenityFlags: {
          has_wifi: true,
          piscina: 1,
          hasChurrasqueira: 1,
        },
      },
    });

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    await fireEvent.click(getRevisarButtons()[0]);

    const dialog = await screen.findByRole('dialog');
    expect(findListItemByLabel(dialog, 'Referência pública')).toHaveTextContent('PUB-HA-001');
    expect(findListItemByLabel(dialog, 'Área construída')).toHaveTextContent('0 m²');
    expect(findListItemByLabel(dialog, 'Área do terreno')).toHaveTextContent('2332 ha');
    expect(findListItemByLabel(dialog, 'Proprietário')).toHaveTextContent('Proprietário Teste');
    expect(findListItemByLabel(dialog, 'Telefone do proprietário')).toHaveTextContent('(61) 99999-0000');
    expect(findListItemByLabel(dialog, 'Anunciante')).toHaveTextContent('Corretora Teste');
    expect(findListItemByLabel(dialog, 'Telefone do anunciante')).toHaveTextContent('(61) 98888-1111');
    for (const amenity of ALL_AMENITIES_16) {
      expect(findAmenityInActiveSection(dialog, amenity)).toBeInTheDocument();
    }

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));
    await setAmenityChecked(dialog, 'Wi-Fi', false);
    await setAmenityChecked(dialog, 'Sistema de segurança/câmera', true);
    const smokeSaveButtons = within(dialog).getAllByRole('button', { name: 'Salvar' });
    await fireEvent.click(smokeSaveButtons[0]);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    const [, smokePayload] = apiPutMock.mock.calls[0] as [string, SavePayload];
    expect(smokePayload.amenities).toEqual(expect.arrayContaining(ALL_AMENITIES_16.filter((amenity) => amenity !== 'Wi-Fi')));
    expect(smokePayload.amenities).not.toContain('Wi-Fi');
    expect(smokePayload.amenities).toHaveLength(ALL_AMENITIES_16.length - 1);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await fireEvent.click(getRevisarButtons()[0]);
    const reopenedDialog = await screen.findByRole('dialog');
    expect(findAmenityInActiveSection(reopenedDialog, 'Mobiliada')).toBeInTheDocument();
    expect(within(getAmenitySection(reopenedDialog, false)).getByText('Wi-Fi')).toBeInTheDocument();
  });

  it('fecha modal somente após PUT 2xx e atualiza a lista pelo refetch', async () => {
    const releasePut = createDeferred<void>();
    let property = clone(basePropertyState);

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
      await releasePut.promise;
      applyServerPatch(property, payload);
      return {};
    });
    apiPatchMock.mockResolvedValue({});

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    const firstRevisar = getRevisarButtons()[0];
    await fireEvent.click(firstRevisar);

    const dialog = await screen.findByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));
    await fireEvent.input(
      within(dialog).getByPlaceholderText('Descricao do imóvel'),
      { target: { value: 'Persistência após resposta real' } }
    );
    const saveButtons = within(dialog).getAllByRole('button', { name: 'Salvar' });
    const saveButton = saveButtons[0];

    const listCallsBeforeSave = getPropertiesListCallCount();
    await fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    expect(getPropertiesListCallCount()).toBe(listCallsBeforeSave);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    expect(toastSuccessMock).not.toHaveBeenCalled();

    releasePut.resolve();

    await waitFor(() => {
      expect(getPropertiesListCallCount()).toBeGreaterThan(listCallsBeforeSave);
      expect(toastSuccessMock).toHaveBeenCalledWith('Imóvel atualizado com sucesso.');
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await fireEvent.click(getRevisarButtons()[0]);
    const reopenedDialog = await screen.findByRole('dialog');
    expect(await within(reopenedDialog).findByText('Persistência após resposta real')).toBeInTheDocument();
    await fireEvent.click(within(reopenedDialog).getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
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

    const [requestEndpoint, requestPayload] = apiPutMock.mock.calls[0] as [string, SavePayload];
    expect(requestEndpoint).toBe('/admin/properties/501');
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
    expect(findListItemByLabel(reopenedDialog, 'Área construída')).toHaveTextContent('3210 ha');
    expect(findAmenityInActiveSection(reopenedDialog, 'Mobiliada')).toBeInTheDocument();
    expect(findAmenityInActiveSection(reopenedDialog, 'Academia')).toBeInTheDocument();
    expect(
      within(reopenedDialog)
        .getAllByRole('listitem')
        .some((item) => item.textContent?.includes('PUB-PEND-01'))
    ).toBe(true);
  });

  it('persiste todas as 16 amenities e mantém reabertura consistente', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'approved',
        request_type: null,
        amenities: ['Wi-Fi', 'Piscina', 'Mobiliada'],
      },
    });

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    const firstRevisar = getRevisarButtons()[0];
    await fireEvent.click(firstRevisar);

    const dialog = await screen.findByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));
    for (const amenity of ALL_AMENITIES_16) {
      await setAmenityChecked(dialog, amenity, true);
    }

    const saveButtons = within(dialog).getAllByRole('button', { name: 'Salvar' });
    await fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    const [, amenitiesPayload] = apiPutMock.mock.calls[0] as [string, SavePayload];
    expect(amenitiesPayload.amenities).toEqual(expect.arrayContaining(ALL_AMENITIES_16));
    expect(amenitiesPayload.amenities).toHaveLength(ALL_AMENITIES_16.length);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await fireEvent.click(getRevisarButtons()[0]);
    const reopenedDialog = await screen.findByRole('dialog');
    for (const amenity of ALL_AMENITIES_16) {
      expect(findAmenityInActiveSection(reopenedDialog, amenity)).toBeInTheDocument();
    }
  });

  it('remove todas as amenities e mantém retorno vazio', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'approved',
        request_type: null,
        amenities: ['Poço artesiano', 'Mobiliada'],
      },
    });

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    const firstRevisar = getRevisarButtons()[0];
    await fireEvent.click(firstRevisar);

    const dialog = await screen.findByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));
    for (const amenity of ALL_AMENITIES_16) {
      await setAmenityChecked(dialog, amenity, false);
    }

    const saveButtons = within(dialog).getAllByRole('button', { name: 'Salvar' });
    await fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    const [, amenitiesPayload] = apiPutMock.mock.calls[0] as [string, SavePayload];
    expect(amenitiesPayload.amenities).toEqual([]);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await fireEvent.click(getRevisarButtons()[0]);
    const reopenedDialog = await screen.findByRole('dialog');
    expect(getAmenitySection(reopenedDialog, true)).toHaveTextContent('Nenhuma');
    expect(
      within(getAmenitySection(reopenedDialog, false)).getByText('Wi-Fi')
    ).toBeInTheDocument();
    expect(
      within(getAmenitySection(reopenedDialog, false)).getByText('Sauna')
    ).toBeInTheDocument();
  });

  it('exibe 200 ha e 10 alqueire sem converter visualmente para m²', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'approved',
        request_type: null,
        area_construida_valor: 200,
        area_terreno_valor: 10,
        area_construida_unidade: 'hectare',
        area_terreno_unidade: 'alqueire',
      },
    });

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    await fireEvent.click(getRevisarButtons()[0]);

    const dialog = await screen.findByRole('dialog');
    expect(findListItemByLabel(dialog, 'Área construída')).toHaveTextContent('200 ha');
    expect(findListItemByLabel(dialog, 'Área do terreno')).toHaveTextContent('10 alqueire');
  });

  it('reabre imóvel com 2332 ha no terreno e mantém o valor no input/seletor', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'approved',
        request_type: null,
        area_terreno_valor: 2332,
        area_terreno_unidade: 'hectare',
        area_terreno_m2: 23320000,
        area_terreno: 23320000,
      },
    });

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    await fireEvent.click(getRevisarButtons()[0]);

    const dialog = await screen.findByRole('dialog');
    expect(findListItemByLabel(dialog, 'Área do terreno')).toHaveTextContent('2332 ha');

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));
    const terrainInput = dialog.querySelector('input[name="area_terreno_valor"]');
    const terrainUnit = dialog.querySelector('select[name="area_terreno_unidade"]');
    expect(terrainInput).toBeTruthy();
    expect((terrainInput as HTMLInputElement).value).toBe('2332');
    expect(terrainUnit).toBeTruthy();
    expect((terrainUnit as HTMLSelectElement).value).toBe('hectare');
  });

  it('salva sem alterar campos de área e preserva 2332 ha no payload', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'approved',
        request_type: null,
        area_terreno_valor: 2332,
        area_terreno_unidade: 'hectare',
        area_terreno_m2: 23320000,
        area_terreno: 23320000,
      },
    });

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    await fireEvent.click(getRevisarButtons()[0]);

    const dialog = await screen.findByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));
    const saveButtons = within(dialog).getAllByRole('button', { name: 'Salvar' });
    await fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    const [, payload] = apiPutMock.mock.calls[0] as [string, SavePayload];
    expect(payload).toMatchObject({
      area_terreno_valor: 2332,
      area_terreno_unidade: 'hectare',
    });
  });

  it('altera unidade do terreno para alqueire e envia 10 no payload', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'approved',
        request_type: null,
        area_terreno_valor: 1,
        area_terreno_unidade: 'm2',
      },
    });

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    await fireEvent.click(getRevisarButtons()[0]);

    const dialog = await screen.findByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));
    const terrainInput = dialog.querySelector('input[name="area_terreno_valor"]');
    const terrainUnit = dialog.querySelector('select[name="area_terreno_unidade"]');
    expect(terrainInput).toBeTruthy();
    expect(terrainUnit).toBeTruthy();
    await fireEvent.input(terrainInput as HTMLInputElement, { target: { value: '10' } });
    await fireEvent.change(terrainUnit as HTMLSelectElement, { target: { value: 'alqueire' } });

    const saveButtons = within(dialog).getAllByRole('button', { name: 'Salvar' });
    await fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    const [, payload] = apiPutMock.mock.calls[0] as [string, SavePayload];
    expect(payload).toMatchObject({
      area_terreno_valor: 10,
      area_terreno_unidade: 'alqueire',
    });
  });

  it('permite valor zero em campos numéricos e envia payload sem status inválido', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'approved',
        request_type: null,
      },
    });

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    await fireEvent.click(getRevisarButtons()[0]);

    const dialog = await screen.findByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));
    const bedroomsInput = dialog.querySelector('input[name="bedrooms"]');
    const bathroomsInput = dialog.querySelector('input[name="bathrooms"]');
    const garageInput = dialog.querySelector('input[name="garage_spots"]');
    expect(bedroomsInput).toBeTruthy();
    expect(bathroomsInput).toBeTruthy();
    expect(garageInput).toBeTruthy();
    await fireEvent.input(bedroomsInput as HTMLInputElement, { target: { value: '0' } });
    await fireEvent.input(bathroomsInput as HTMLInputElement, { target: { value: '0' } });
    await fireEvent.input(garageInput as HTMLInputElement, { target: { value: '0' } });
    await fireEvent.input(within(dialog).getByPlaceholderText('Descricao do imóvel'), {
      target: { value: 'Com zeros' },
    });

    const zeroSaveButtons = within(dialog).getAllByRole('button', { name: 'Salvar' });
    await fireEvent.click(zeroSaveButtons[0]);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    const [, zeroPayload] = apiPutMock.mock.calls[0] as [string, SavePayload];
    expect(zeroPayload.bedrooms).toBe(0);
    expect(zeroPayload.bathrooms).toBe(0);
    expect(zeroPayload.garage_spots).toBe(0);
    expect(apiPutMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Imóvel atualizado com sucesso.');
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('mantém modal e mostra erro quando PUT retorna falha', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        status: 'approved',
      },
    });
    apiPutMock.mockRejectedValueOnce(new Error('Falha de integração para validação'));

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    await fireEvent.click(getRevisarButtons()[0]);

    const dialog = await screen.findByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));
    await fireEvent.input(within(dialog).getByPlaceholderText('Descricao do imóvel'), {
      target: { value: 'Falha esperada' },
    });
    const errorSaveButtons = within(dialog).getAllByRole('button', { name: 'Salvar' });
    await fireEvent.click(errorSaveButtons[0]);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('Falha de integração para validação')).toBeInTheDocument();
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it('exibe fallback de referência pública sem id sequencial quando public_code não existe', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        public_code: null,
      },
    });

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));
    await fireEvent.click(getRevisarButtons()[0]);

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('Dashboard / Imóveis / Referência Sem referência pública')
    ).toBeInTheDocument();

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Editar dados' }));
    const publicCodeInput = dialog.querySelector('input[name="code"]');
    expect(publicCodeInput).toBeTruthy();
    expect((publicCodeInput as HTMLInputElement).value).toBe('Sem referência pública');
  });

  it('navega entre imagens da pré-visualização sem fechar ao clicar nas setas', async () => {
    mockPropertyManagementRequests({
      initialProperty: {
        ...basePropertyState,
        images: [
          { id: 1, url: 'https://example.com/casa-1.jpg' },
          { id: 2, url: 'https://example.com/casa-2.jpg' },
        ],
      },
    });

    render(PropertyManagement);

    await waitFor(() => expect(getRevisarButtons().length).toBeGreaterThan(0));

    const coverButtons = screen.getAllByRole('button', {
      name: 'Abrir capa do imóvel Casa Horizonte em tela cheia',
    });
    const coverButton = coverButtons.find((button) => button.tagName === 'BUTTON');
    expect(coverButton).toBeTruthy();
    await fireEvent.click(coverButton as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Foto 1 de 2' })).toHaveAttribute(
        'aria-current',
        'true',
      );
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Próxima imagem' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Foto 2 de 2' })).toHaveAttribute(
        'aria-current',
        'true',
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Imagem anterior' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Foto 1 de 2' })).toHaveAttribute(
        'aria-current',
        'true',
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
