// Only installed by isolated browser tests/preview. Never imported by src/.
import type { BrowserContext, Route } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export async function installPropertyLocationApi(context: BrowserContext, databasePath: string, localOrigin = 'http://127.0.0.1:4173') {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('CREATE TABLE IF NOT EXISTS synthetic_properties (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)');
  const requests: Array<{ method: string; path: string; status: number }> = [];
  const json = (route: Route, payload: unknown, status = 200) => {
    const url = new URL(route.request().url());
    if (url.origin === 'https://127.0.0.1:4011') requests.push({
      method: route.request().method(), path: url.pathname, status,
    });
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
  };
  const read = (id = 1): Record<string, any> | null => {
    const row = db.prepare('SELECT payload FROM synthetic_properties WHERE id=?').get(id);
    return row ? JSON.parse(String(row.payload)) : null;
  };
  const cities = [{ id: 520, name: 'Turvelândia', state: 'GO' }, { id: 521, name: 'Rio Verde', state: 'GO' }];
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (url.origin === localOrigin) return route.continue();
    if (url.hostname === 'viacep.com.br') {
      const zip = path.split('/')[2];
      return json(route, zip === '75970000'
        ? { cep: '75970-000', uf: 'GO', localidade: 'Turvelândia', bairro: '', logradouro: '', ibge: '5221551' }
        : zip === '75901000'
          ? { cep: '75901-000', uf: 'GO', localidade: 'Rio Verde', bairro: 'Centro', logradouro: 'Rua sintética' }
          : { erro: true });
    }
    if (url.hostname === 'uploads.synthetic.invalid') return json(route, { secure_url: 'https://images.synthetic.invalid/foto.png' });
    if (url.hostname === 'images.synthetic.invalid') return route.fulfill({ contentType: 'image/png', body:
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5ZcAAAAASUVORK5CYII=', 'base64') });
    // Block all external access: synthetic requests cannot touch Production.
    if (url.origin !== 'https://127.0.0.1:4011') return route.abort('blockedbyclient');
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204 });
    if (path === '/admin/me') return json(route, { admin: { id: 900001, name: 'Administrador sintético', role: 'admin' } });
    if (path === '/locations/cities') return json(route, { data: cities.filter(c =>
      c.state === url.searchParams.get('state') && normalize(c.name).startsWith(url.searchParams.get('search') ?? '')) });
    if (path === '/locations/neighborhoods') return json(route, { data: url.searchParams.get('cityId') === '521' ? [{ name: 'Centro' }] : [] });
    if (path === '/properties/cities') return json(route, cities.map(c => c.name));
    if (path === '/admin/uploads/sign') return json(route, { uploadUrl: 'https://uploads.synthetic.invalid/image',
      apiKey: 'synthetic', signature: 'synthetic', timestamp: 1, folder: 'synthetic', allowedFormats: ['png', 'jpg', 'jpeg', 'webp'], maxFileSize: 15728640 });
    if (path === '/admin/properties' && req.method() === 'POST') {
      const payload = req.postDataJSON();
      const saved = { ...payload, id: 1, public_code: 'QA-CEP-1', images: (payload.image_urls ?? []).map((url: string) => ({ id: 1, url })) };
      db.prepare('INSERT INTO synthetic_properties (id,payload) VALUES (?,?)').run(1, JSON.stringify(saved));
      return json(route, { propertyId: 1, public_code: saved.public_code }, 201);
    }
    if (path === '/admin/properties/1' && req.method() === 'PUT') {
      const saved = { ...read(), ...req.postDataJSON() };
      db.prepare('UPDATE synthetic_properties SET payload=? WHERE id=1').run(JSON.stringify(saved));
      return json(route, { success: true });
    }
    if (path === '/admin/properties/1') return json(route, read());
    if (path === '/admin/properties-with-brokers') {
      const p = read(); return json(route, { data: p ? [p] : [], total: p ? 1 : 0 });
    }
    return json(route, { data: [], total: 0 });
  });
  await context.addInitScript(() => sessionStorage.setItem('authToken', 'synthetic-local-only'));
  return { read, requests, close: () => db.close() };
}
