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
  it.each([{ label: 'curta', password: 'curta' }, { label: 'em branco', password: ' '.repeat(14) }])('impede abrir reauth e associa o erro a NOVA SENHA: $label', async ({ password }) => {
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


describe('limite UTF-8 antes de qualquer operacao administrativa', () => {
  it.each([
    { label: 'ASCII 73', password: 'a'.repeat(73) },
    { label: 'acentos 74', password: 'á'.repeat(37) },
    { label: 'emoji 76', password: '🔐'.repeat(19) },
  ])('reset rejeita $label no campo sem abrir confirmacao nem truncar', async ({ password }) => {
    const input = await assistantEditor();
    await fireEvent.input(input, { target: { value: password } });
    await fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha', exact: true }));
    fieldHasMessage(input, /72 bytes UTF-8/);
    expect(input).toHaveValue(password);
    expect(input).not.toHaveAttribute('maxlength');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled(); expect(api.put).not.toHaveBeenCalled();
  });

  it('alteracao propria rejeita bytes excedentes sem limitar senha atual legada', async () => {
    const form = await ownDialog();
    const current = screen.getByLabelText('Senha atual'), next = screen.getByLabelText('Nova senha');
    await fireEvent.input(current, { target: { value: 'a'.repeat(100) } });
    await fireEvent.input(next, { target: { value: '🔐'.repeat(19) } });
    await fireEvent.submit(form);
    fieldHasMessage(next, /72 bytes UTF-8/);
    expect(current).not.toHaveAttribute('maxlength'); expect(next).not.toHaveAttribute('maxlength');
    expect(api.put).not.toHaveBeenCalled();
    const password = '🔐'.repeat(18);
    api.put.mockResolvedValue({ token: 'sessao-sintetica-renovada' });
    await fireEvent.input(next, { target: { value: password } });
    await fireEvent.submit(form);
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    expect(api.put.mock.calls[0][1]).toEqual({ currentPassword: 'a'.repeat(100), newPassword: password });
  });

  it('cadastro valida no proprio campo e envia exatamente 72 bytes com espacos', async () => {
    render(Assistants);
    await screen.findByText(target.email);
    await fireEvent.input(screen.getByLabelText('Nome'), { target: { value: 'Novo sintetico' } });
    await fireEvent.input(screen.getByLabelText('E-mail'), { target: { value: 'novo@example.test' } });
    const initial = screen.getByLabelText('Senha inicial');
    const form = initial.closest('form')!;
    await fireEvent.input(initial, { target: { value: 'á'.repeat(37) } });
    await fireEvent.submit(form);
    fieldHasMessage(initial, /72 bytes UTF-8/);
    expect(initial).not.toHaveAttribute('maxlength'); expect(api.post).not.toHaveBeenCalled();
    const password = ' ' + 'a'.repeat(70) + ' ';
    api.post.mockResolvedValue({});
    await fireEvent.input(initial, { target: { value: password } });
    await fireEvent.submit(form);
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls[0][1].password).toBe(password);
  });

  it.each(['PASSWORD_TOO_LONG_BYTES', 'PASSWORD_NOT_DIFFERENT'])('reset associa erro do servidor a nova senha: %s', async code => {
    const input = await assistantEditor();
    await fireEvent.input(input, { target: { value: 'Nova senha sintetica 2026!' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha', exact: true }));
    api.post.mockResolvedValue({ reauthToken: 'confirmacao-sintetica' });
    api.put.mockRejectedValue({ response: { status: 400, data: { code, error: 'Nova senha recusada pelo servidor.' } } });
    await fireEvent.input(screen.getByLabelText('Senha do administrador'), { target: { value: 'curta' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar redefinição' }));
    await waitFor(() => fieldHasMessage(input, /recusada pelo servidor/));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(success).not.toHaveBeenCalled();
  });
});


describe('erros de politica devolvidos pela API', () => {
  it.each(['PASSWORD_TOO_LONG_BYTES', 'PASSWORD_NOT_DIFFERENT'])('alteracao propria: %s no campo novo, sem sucesso ou perda de sessao', async code => {
    const form = await ownDialog();
    await fireEvent.input(screen.getByLabelText('Senha atual'), { target: { value: 'legada' } });
    const next = screen.getByLabelText('Nova senha');
    await fireEvent.input(next, { target: { value: 'Nova senha sintetica 2026!' } });
    api.put.mockRejectedValue({ response: { status: 400, data: { code, error: 'Nova senha recusada.' } } });
    await fireEvent.submit(form);
    await waitFor(() => fieldHasMessage(next, /recusada/));
    expect(success).not.toHaveBeenCalled(); expect(get(authToken)).toBe('sessao-sintetica-inicial');
  });

  it('cadastro: erro de politica no campo inicial', async () => {
    render(Assistants); await screen.findByText(target.email);
    const input = screen.getByLabelText('Senha inicial');
    await fireEvent.input(input, { target: { value: 'Nova senha sintetica 2026!' } });
    api.post.mockRejectedValue({ response: { status: 400, data: { code: 'PASSWORD_TOO_LONG_BYTES', error: 'Nova senha recusada.' } } });
    await fireEvent.submit(input.closest('form')!);
    await waitFor(() => fieldHasMessage(input, /recusada/));
    expect(success).not.toHaveBeenCalled();
  });
});
