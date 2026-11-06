import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import Header from '../../src/lib/Header.svelte';
import Assistants from '../../src/lib/components/AdministrativeAssistantsManagement.svelte';
import { adminSession, getDefaultAdminCapabilities } from '../../src/lib/sessionState';
import { authToken } from '../../src/lib/store';

const { api, success } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() }, success: vi.fn(),
}));
vi.mock('$lib/apiClient', () => ({ api }));
vi.mock('svelte-sonner', () => ({ toast: { success, error: vi.fn() } }));
const target = { id: 2, name: 'Auxiliar sintetico', email: 'aux@example.test', isActive: true };
beforeEach(() => {
  vi.resetAllMocks();
  adminSession.set({ id: 1, role: 'admin', capabilities: getDefaultAdminCapabilities() });
  authToken.set('sessao-sintetica-inicial');
  api.get.mockResolvedValue({ data: [target] });
});
async function assistantEditor() {
  render(Assistants);
  await screen.findByText(target.email);
  await fireEvent.click(screen.getByRole('button', { name: 'Editar auxiliar' }));
  return screen.getByLabelText('Nova senha');
}
async function ownDialog() {
  render(Header, { pageTitle: 'Teste sintetico' });
  await fireEvent.click(screen.getByRole('button', { name: /Abrir menu de/ }));
  await fireEvent.click(screen.getByRole('menuitem', { name: 'Alterar minha senha' }));
  return screen.getByRole('button', { name: 'Salvar senha' }).closest('form')!;
}
function fieldHasMessage(input: HTMLElement, text: RegExp) {
  const id = input.getAttribute('aria-describedby');
  expect(id).toBeTruthy();
  expect(id!.split(/\s+/).map(id => document.getElementById(id)?.textContent).join(' ')).toMatch(text);
}

describe('validacao antes da confirmacao administrativa', () => {
  it.each(['curta', ' '.repeat(14)])('impede abrir reauth e associa o erro a NOVA SENHA', async password => {
    const input = await assistantEditor();
    await fireEvent.input(input, { target: { value: password } });
    await fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha', exact: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fieldHasMessage(input, password.trim() ? /pelo menos 14/ : /Informe uma senha/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('valida vazio ao tentar prosseguir, aceita nova senha valida e confirma identidade com senha legada curta', async () => {
    const input = await assistantEditor();
    await fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha', exact: true }));
    fieldHasMessage(input, /Informe uma senha/);
    const password = '  Nova senha sintetica 2026!  ';
    await fireEvent.input(input, { target: { value: password } });
    await fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha', exact: true }));
    const current = screen.getByLabelText('Senha do administrador');
    expect(current).not.toHaveAttribute('minlength');
    await fireEvent.input(current, { target: { value: '  antigo!  ' } });
    api.post.mockResolvedValue({ reauthToken: 'confirmacao-sintetica' });
    api.put.mockResolvedValue({ message: 'Senha atualizada.' });
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar redefinição' }));
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith('/admin/reauth', { password: '  antigo!  ', action: 'reset_assistant_password', targetAdminId: 2 }, expect.anything());
    expect(api.put).toHaveBeenCalledWith('/admin/assistants/2/password', { password }, expect.anything());
  });
});

describe('alteracao da propria senha', () => {
  it('mostra a politica no campo NOVA SENHA antes da API, sem aplica-la a senha atual', async () => {
    const form = await ownDialog();
    await fireEvent.input(screen.getByLabelText('Senha atual'), { target: { value: 'curta' } });
    const input = screen.getByLabelText('Nova senha');
    await fireEvent.input(input, { target: { value: 'curta' } });
    await fireEvent.submit(form);
    fieldHasMessage(input, /pelo menos 14/);
    expect(screen.getByLabelText('Senha atual')).not.toHaveAttribute('minlength');
    expect(api.put).not.toHaveBeenCalled();
  });

  it('aguarda a resposta, envia valores exatos, bloqueia envio concorrente e persiste a sessao renovada', async () => {
    const form = await ownDialog();
    const password = '  Nova senha sintetica 2026!  ';
    let release!: (v: unknown) => void;
    api.put.mockReturnValue(new Promise(resolve => { release = resolve; }));
    await fireEvent.input(screen.getByLabelText('Senha atual'), { target: { value: '  antigo!  ' } });
    await fireEvent.input(screen.getByLabelText('Nova senha'), { target: { value: password } });
    await fireEvent.submit(form);
    await fireEvent.submit(form);
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put.mock.calls[0][0]).toBe('/admin/me/password');
    expect(api.put.mock.calls[0][1]).toEqual({ currentPassword: '  antigo!  ', newPassword: password });
    expect(success).not.toHaveBeenCalled();
    release({ token: 'nova-sessao-sintetica', message: 'Senha atualizada.' });
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    expect(get(authToken)).toBe('nova-sessao-sintetica');
    expect(sessionStorage.getItem('authToken')).toBe('nova-sessao-sintetica');
  });

  it('associa senha atual incorreta ao campo correto e nao apresenta sucesso', async () => {
    const form = await ownDialog();
    api.put.mockRejectedValue({ response: { status: 401, data: { code: 'ADMIN_CURRENT_PASSWORD_INVALID', error: 'Senha atual incorreta.' } } });
    await fireEvent.input(screen.getByLabelText('Senha atual'), { target: { value: 'errada' } });
    await fireEvent.input(screen.getByLabelText('Nova senha'), { target: { value: 'Nova senha sintetica 2026!' } });
    await fireEvent.submit(form);
    await waitFor(() => fieldHasMessage(screen.getByLabelText('Senha atual'), /Senha atual incorreta/));
    expect(success).not.toHaveBeenCalled();
  });

  it('nao apresenta sucesso em falha HTTP nem em resposta sem renovacao de sessao', async () => {
    const form = await ownDialog();
    await fireEvent.input(screen.getByLabelText('Senha atual'), { target: { value: '  antigo!  ' } });
    await fireEvent.input(screen.getByLabelText('Nova senha'), { target: { value: 'Nova senha sintetica 2026!' } });
    api.put.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Falha de teste.' } } });
    await fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Falha de teste.'));
    api.put.mockResolvedValueOnce({});
    await fireEvent.submit(form);
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2));
    expect(success).not.toHaveBeenCalled();
    expect(get(authToken)).toBe('sessao-sintetica-inicial');
  });
});
