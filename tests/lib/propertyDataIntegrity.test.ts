import { describe, expect, it } from 'vitest';
import { buildPropertyEditPayload, type PropertyEditLike } from '../../src/lib/components/property/propertyEditHelpers';
import { parsePropertyAreaNumber, resolvePropertyAreaValues } from '../../src/lib/components/property/propertyFormattingHelpers';

const base = { id: 501, status: 'approved', type: 'Casa', purpose: 'Venda', price: 400000,
  owner_id: 701, owner_name: 'Proprietário original', owner_phone: '62999990000', broker_id: null,
  area_construida_valor: null, area_construida_m2: 84.75, area_construida: 84.75, area_construida_unidade: 'm2',
  area_terreno_valor: null, area_terreno_m2: 210.5, area_terreno: 210.5, area_terreno_unidade: 'm2' };
function payload(original: PropertyEditLike, patch: Partial<PropertyEditLike> = {}) {
  const result = buildPropertyEditPayload({ originalProperty: original,
    editableProperty: { ...original, ...resolvePropertyAreaValues(original), ...patch },
    flags: { editSemNumero: true, editSemQuadra: true, editSemLote: true, editSemCep: false },
    state: { editPromotionSalePercentageDisplay: '', editPromotionRentPercentageDisplay: '',
      editValorCondominioDisplay: '', editValorIptuDisplay: '', editSelectedAmenities: [] } });
  expect(result.ok).toBe(true); if (!result.ok) throw new Error(result.error); return result.payload;
}

describe('integridade de proprietário e áreas no payload administrativo', () => {
  it.each(['Casa', 'Apartamento', 'Terreno'])('adicionar corretor em %s não reenvia proprietário ou áreas', type => {
    const original = { ...base, type };
    const patch = payload(original, { broker_id: 902 });
    expect(patch.broker_id).toBe(902);
    for (const field of ['owner_id', 'owner_name', 'owner_phone', 'area_construida', 'area_construida_valor', 'area_construida_unidade', 'area_terreno', 'area_terreno_valor', 'area_terreno_unidade']) expect(patch).not.toHaveProperty(field);
    expect(original.owner_id).toBe(701);
  });
  it('editar explicitamente o proprietário não muda anunciante ou áreas', () => {
    const patch = payload({ ...base, broker_id: 902 }, { owner_name: 'Nome corrigido' });
    expect(patch.owner_name).toBe('Nome corrigido');
    for (const field of ['owner_id', 'owner_phone', 'broker_id', 'area_construida_valor', 'area_terreno_valor']) expect(patch).not.toHaveProperty(field);
  });
  it('alterar somente uma área mantém a outra ausente do PATCH', () => {
    const patch = payload(base, { area_construida_valor: '92,75' });
    expect(patch).toMatchObject({ area_construida_valor: 92.75, area_construida_unidade: 'm2' });
    for (const field of ['area_terreno_valor', 'area_terreno_unidade', 'owner_id', 'broker_id']) expect(patch).not.toHaveProperty(field);
  });
  it('limpar uma área é explícito e não apaga a outra', () => {
    const patch = payload(base, { area_construida_valor: null });
    expect(patch.area_construida_valor).toBeNull(); expect(patch).not.toHaveProperty('area_terreno_valor');
  });
  it('não converte área não carregada em null', () => {
    const patch = payload({ id: 1, price: 400000, purpose: 'Venda' }, { title: 'Título corrigido' });
    expect(Object.keys(patch).filter(k => k.startsWith('area_'))).toEqual([]);
  });
  it('recupera campos legados sem perder casas decimais', () => {
    expect(resolvePropertyAreaValues(base)).toMatchObject({ area_construida_valor: 84.75, area_terreno_valor: 210.5 });
  });
  it.each([['hectare', 10000], ['alqueire', 48400]])('recupera valor de input em %s a partir de m²', (unit, factor) => {
    const property = { ...base, area_terreno_m2: Number(factor) * 1.25, area_terreno_unidade: String(unit) };
    expect(resolvePropertyAreaValues(property).area_terreno_valor).toBe(1.25);
    expect(payload(property, { broker_id: 902 })).not.toHaveProperty('area_terreno_valor');
  });
  it.each([84.75, '84.75', '84,75'])('preserva decimal vindo da API ou do formulário: %s', value => {
    expect(parsePropertyAreaNumber(value)).toBe(84.75);
  });
});
