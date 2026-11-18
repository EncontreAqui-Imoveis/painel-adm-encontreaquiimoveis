import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('$lib/apiClient', () => ({ api: { get }, apiClient: {} }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import CreateProperty from '../../src/lib/components/CreateProperty.svelte';

const turvelandia = { id: 520, name: 'Turvelândia', state: 'GO' };
const rioVerde = { id: 521, name: 'Rio Verde', state: 'GO' };

beforeEach(() => {
  vi.useFakeTimers();
  get.mockReset().mockImplementation(async (path: string) => {
    if (path.includes('/locations/cities')) {
      return { data: path.includes('turvel') ? [turvelandia] : [rioVerde] };
    }
    return { data: [] };
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    cep: '75970-000', uf: 'GO', localidade: 'Turvelândia', bairro: '', logradouro: '', ibge: '5221551',
  }) }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('endereço do imóvel', () => {
  it('reproduz CEP de Turvelândia e reconhece a cidade antes de informar bairro', async () => {
    render(CreateProperty);
    await vi.advanceTimersByTimeAsync(300);
    await fireEvent.input(document.querySelector('#create-property-cep')!, { target: { value: '75970-000' } });
    await vi.advanceTimersByTimeAsync(700);
    await tick();
    expect(screen.getByLabelText('Cidade *')).toHaveValue('Turvelândia');
    expect(document.querySelector('#create-property-bairro')).not.toBeDisabled();
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/locations\/cities\?.*search=turvel/));
  });
});

import PropertyLocationFields from '../../src/lib/components/property/PropertyLocationFields.svelte';

const field = (name: string) => document.querySelector(`[name="${name}"]`)! as HTMLInputElement;
const input = (name: string, value: string) => fireEvent.input(field(name), { target: { value } });
const settle = async () => { await vi.advanceTimersByTimeAsync(650); await tick(); };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const cepResponse = (localidade: string, bairro = '', uf = 'GO') => ({
  ok: true, json: async () => ({ localidade, bairro, uf, logradouro: 'Rua sintética', ibge: '5221551' }),
});

it.each(['Turvelândia', 'Rio Verde'])('seleção manual de %s habilita bairro e resolve ID real do catálogo', async name => {
  get.mockImplementation(async (path: string) => {
    if (path.includes('/locations/cities')) return { data: [turvelandia, rioVerde] };
    return { data: [{ name: 'Centro' }] };
  });
  render(PropertyLocationFields);
  await input('city', name);
  await settle();
  expect(field('bairro')).not.toBeDisabled();
  expect(get).toHaveBeenCalledWith(expect.stringContaining(`cityId=${name === 'Turvelândia' ? 520 : 521}`));
  expect(document.querySelector('[id$="bairros-list"] option')).toHaveValue('Centro');
});

it.each(['Centro', ''])('CEP preenche cidade e bairro %j sem depender de bairros cadastrados', async bairro => {
  vi.mocked(fetch).mockResolvedValue(cepResponse('Turvelândia', bairro) as Response);
  render(PropertyLocationFields);
  await input('cep', '75970000'); await settle();
  expect(field('state')).toHaveValue('GO');
  expect(field('city')).toHaveValue('Turvelândia');
  expect(field('bairro')).toHaveValue(bairro);
  expect(field('bairro')).not.toBeDisabled();
  await input('bairro', 'Bairro informado manualmente'); await settle();
  expect(field('bairro')).toHaveValue('Bairro informado manualmente');
  expect(get).toHaveBeenCalledWith(expect.stringContaining('cityId=520'));
  expect(get.mock.calls.every(([url]) => !String(url).includes('cityId=5221551'))).toBe(true);
});

it('cidade sem catálogo de bairros permite digitação manual, sem IDs ou bairros artificiais', async () => {
  render(PropertyLocationFields, { city: 'Turvelândia', bairro: 'Bairro existente' }); await settle();
  expect(field('bairro')).not.toBeDisabled();
  expect(document.querySelectorAll('[id$="bairros-list"] option')).toHaveLength(0);
  expect(field('bairro')).toHaveValue('Bairro existente');
  await input('bairro', 'Novo bairro'); expect(field('bairro')).toHaveValue('Novo bairro');
});

it('cidade não encontrada no catálogo não bloqueia endereço manual nem inventa ID', async () => {
  get.mockResolvedValue({ data: [] });
  render(PropertyLocationFields);
  await input('city', 'Município informado'); await settle();
  await input('bairro', 'Bairro manual');
  expect(field('bairro')).not.toBeDisabled();
  expect(get.mock.calls.some(([url]) => String(url).includes('neighborhoods'))).toBe(false);
});

it('troca manual após CEP limpa bairro incompatível e carrega nova cidade', async () => {
  get.mockImplementation(async (path: string) => ({ data: path.includes('cities')
    ? [turvelandia, rioVerde] : [{ name: path.includes('cityId=520') ? 'Bairro Turvelândia' : 'Centro Rio Verde' }] }));
  vi.mocked(fetch).mockResolvedValue(cepResponse('Turvelândia', 'Bairro Turvelândia') as Response);
  render(PropertyLocationFields);
  await input('cep', '75970000'); await settle();
  await input('city', 'Rio Verde');
  expect(field('bairro')).toHaveValue('');
  await settle();
  expect(field('city')).toHaveValue('Rio Verde');
  expect(document.querySelector('[id$="bairros-list"] option')).toHaveValue('Centro Rio Verde');
  // Reusing a cached city must still resolve its ID and fetch matching suggestions.
  await input('city', 'Turvelândia'); await settle();
  expect(document.querySelector('[id$="bairros-list"] option')).toHaveValue('Bairro Turvelândia');
});

it('resposta do CEP anterior não sobrescreve o CEP mais recente', async () => {
  const slow = deferred<Response>();
  vi.mocked(fetch).mockReturnValueOnce(slow.promise).mockResolvedValueOnce(cepResponse('Rio Verde', 'Centro') as Response);
  render(PropertyLocationFields);
  await input('cep', '75970000');
  await input('cep', '75901000'); await settle();
  slow.resolve(cepResponse('Turvelândia', 'Antigo') as Response); await settle();
  expect(field('cep')).toHaveValue('75901-000');
  expect(field('city')).toHaveValue('Rio Verde'); expect(field('bairro')).toHaveValue('Centro');
});

it.each(['city', 'bairro', 'cep'])('edição manual em %s invalida consulta CEP pendente', async name => {
  const slow = deferred<Response>(); vi.mocked(fetch).mockReturnValue(slow.promise);
  render(PropertyLocationFields, { city: 'Rio Verde', bairro: 'Centro' }); await settle();
  await input('cep', '75970000');
  await input(name, name === 'cep' ? '75970' : name === 'city' ? 'Goiânia' : 'Bairro manual');
  slow.resolve(cepResponse('Turvelândia', 'Antigo') as Response); await settle();
  expect(field('city')).toHaveValue(name === 'city' ? 'Goiânia' : 'Rio Verde');
  if (name === 'bairro') expect(field('bairro')).toHaveValue('Bairro manual');
});

it('respostas atrasadas de cidades e bairros não contaminam a nova seleção, inclusive durante debounce', async () => {
  const slowCity = deferred<unknown>(), slowBairro = deferred<unknown>();
  get.mockImplementation(async (path: string) => {
    if (path.includes('search=turvel')) return slowCity.promise;
    if (path.includes('/locations/cities')) return { data: [rioVerde] };
    if (path.includes('cityId=521')) return slowBairro.promise;
    return { data: [] };
  });
  render(PropertyLocationFields);
  await input('city', 'Turvelândia'); await vi.advanceTimersByTimeAsync(300);
  await input('city', 'Rio Verde'); await settle();
  slowCity.resolve({ data: [turvelandia] }); await settle();
  expect(field('city')).toHaveValue('Rio Verde');
  expect(document.querySelector('[id$="cities-list"] option')).toHaveValue('Rio Verde');
  await input('city', 'Outra cidade');
  slowBairro.resolve({ data: [{ name: 'Bairro antigo' }] }); await tick();
  expect(document.querySelectorAll('[id$="bairros-list"] option')).toHaveLength(0);
});

it('UF integra a busca e o cache, sem confundir cidades homônimas', async () => {
  get.mockImplementation(async (path: string) => ({ data: path.includes('cities') ? [
    { id: path.includes('state=GO') ? 100 : 200, name: 'Bom Jesus', state: path.includes('state=GO') ? 'GO' : 'RS' },
  ] : [] }));
  render(PropertyLocationFields, { city: 'Bom Jesus', state: 'GO', bairro: 'Centro' }); await settle();
  expect(get).toHaveBeenCalledWith(expect.stringContaining('cityId=100'));
  await fireEvent.change(field('state'), { target: { value: 'RS' } });
  expect(field('city')).toHaveValue(''); expect(field('bairro')).toBeDisabled();
  await input('city', 'Bom Jesus'); await settle();
  expect(get).toHaveBeenCalledWith(expect.stringContaining('cityId=200'));
});

it('normaliza acentos e espaços e preserva o bairro existente ao abrir edição', async () => {
  render(PropertyLocationFields, { city: '  Turvelandia  ', bairro: 'Bairro já salvo' }); await settle();
  expect(get).toHaveBeenCalledWith(expect.stringContaining('state=GO&search=turvelandia'));
  expect(get).toHaveBeenCalledWith(expect.stringContaining('cityId=520'));
  expect(field('bairro')).toHaveValue('Bairro já salvo');
});

it('CEP inexistente informa erro sem sucesso ou alteração do endereço e permite nova tentativa', async () => {
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ erro: true }) } as Response);
  render(PropertyLocationFields, { city: 'Rio Verde', bairro: 'Centro' });
  await input('cep', '00000000'); await settle();
  expect(screen.getByText('CEP não encontrado.')).toBeVisible();
  expect(field('city')).toHaveValue('Rio Verde'); expect(field('bairro')).toHaveValue('Centro');
  vi.mocked(fetch).mockResolvedValue(cepResponse('Turvelândia') as Response);
  await input('cep', '00000000'); await settle();
  expect(field('city')).toHaveValue('Turvelândia');
});

it('CEP incompleto não consulta serviço externo', async () => {
  render(PropertyLocationFields);
  await input('cep', '123'); await settle();
  expect(fetch).not.toHaveBeenCalled(); expect(field('bairro')).toBeDisabled();
});

it('falhas HTTP de CEP e de sugestões permitem preenchimento manual', async () => {
  get.mockRejectedValue(new Error('Synthetic network failure'));
  vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
  render(PropertyLocationFields);
  await input('cep', '75970000'); await settle();
  expect(screen.getByText(/Não foi possível consultar o CEP/)).toBeVisible();
  await input('city', 'Turvelândia'); await settle();
  expect(screen.getByText('Não foi possível carregar sugestões de cidades.')).toBeVisible();
  expect(field('bairro')).not.toBeDisabled();
});

it('erro de bairros não exige lista cadastrada para digitar', async () => {
  get.mockImplementation(async (path: string) => {
    if (path.includes('neighborhoods')) throw new Error('Synthetic failure');
    return { data: [turvelandia] };
  });
  render(PropertyLocationFields, { city: 'Turvelândia' }); await settle();
  expect(screen.getByText(/Você pode informar o bairro manualmente/)).toBeVisible();
  await input('bairro', 'Manual'); expect(field('bairro')).toHaveValue('Manual');
});

it('tipo rural mantém bairro opcional sem inventar bairro urbano', async () => {
  render(CreateProperty);
  await fireEvent.change(document.querySelector('#create-property-type')!, { target: { value: 'Área rural' } });
  await input('cep', '75970000'); await settle();
  expect(screen.getByLabelText('Bairro')).not.toBeDisabled();
  expect(field('bairro')).toHaveValue('');
});

it('Sem CEP invalida resposta pendente sem preencher um endereço antigo', async () => {
  const slow = deferred<Response>(); vi.mocked(fetch).mockReturnValue(slow.promise);
  render(PropertyLocationFields, { city: 'Rio Verde' });
  await input('cep', '75970000');
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Sem CEP' }));
  slow.resolve(cepResponse('Turvelândia') as Response); await settle();
  expect(field('cep')).toHaveValue(''); expect(field('cep')).toBeDisabled();
  expect(field('city')).toHaveValue('Rio Verde');
});

it('limpeza do formulário pelo pai invalida resposta de CEP pendente', async () => {
  const slow = deferred<Response>(); vi.mocked(fetch).mockReturnValue(slow.promise);
  const view = render(PropertyLocationFields);
  await input('cep', '75970000');
  await view.rerender({ cep: '', city: '', bairro: '' });
  slow.resolve(cepResponse('Turvelândia') as Response); await settle();
  expect(field('city')).toHaveValue(''); expect(field('bairro')).toBeDisabled();
});
