import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { api, success } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }, success: vi.fn(),
}));
vi.mock('$lib/apiClient', () => ({ api }));
vi.mock('svelte-sonner', () => ({ toast: { success, error: vi.fn() } }));
import Assistants from '../../src/lib/components/AdministrativeAssistantsManagement.svelte';

const fixtures = [
  { id: 2, name: 'Auxiliar A sintético', email: 'aux-a@example.test', isActive: true },
  { id: 3, name: 'Auxiliar B sintético', email: 'aux-b@example.test', isActive: true },
];
const replacement = 'Senha auxiliar sintética nova 2026!';
const adminPassword = '  Senha administrativa sintética!  ';
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
const row = (id: number) => screen.getByText(fixtures.find(x => x.id === id)!.email).closest('article')!;
async function edit(id = 2) {
  await screen.findByText(fixtures.find(x => x.id === id)!.email);
  await fireEvent.click(within(row(id)).getByRole('button', { name: 'Editar auxiliar' }));
  await fireEvent.input(screen.getByLabelText('Nova senha'), { target: { value: replacement } });
}
async function openReset() { await fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha', exact: true })); return screen.getByRole('dialog', { name: 'Redefinir senha do auxiliar' }); }
async function confirm() { await fireEvent.input(screen.getByLabelText('Senha do administrador'), { target: { value: adminPassword } }); await fireEvent.click(screen.getByRole('button', { name: 'Confirmar redefinição' })); }
beforeEach(() => {
  vi.clearAllMocks(); api.get.mockResolvedValue({ data: fixtures }); api.post.mockResolvedValue({ reauthToken: 'synthetic-reauth' }); api.put.mockResolvedValue({ message: 'ok' }); api.delete.mockResolvedValue({ message: 'ok' });
});

describe('BUG-001/002/004 — assistant confirmation', () => {
  it('identifies the target, masks the admin password and blocks selection while confirmation is open', async () => {
    render(Assistants); await edit(); const dialog = await openReset();
    expect(dialog).toHaveTextContent('Auxiliar A sintético'); expect(dialog).toHaveTextContent('ID 2');
    expect(screen.getByLabelText('Senha do administrador')).toHaveAttribute('type', 'password');
    expect(within(row(3)).getByRole('button', { name: 'Editar auxiliar' })).toBeDisabled();
    expect(screen.getByLabelText('Nova senha')).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('captures target and replacement immutably across a slow reauthentication, even after synthetic programmatic change attempts', async () => {
    const pending = deferred<{ reauthToken: string }>(); api.post.mockReturnValueOnce(pending.promise);
    render(Assistants); await edit(); await openReset(); await confirm();
    expect(api.post).toHaveBeenCalledWith('/admin/reauth', { password: adminPassword, action: 'reset_assistant_password', targetAdminId: 2 }, { skipErrorToast: true });
    expect(within(row(3)).getByRole('button', { name: 'Editar auxiliar' })).toBeDisabled();
    await fireEvent.click(within(row(3)).getByRole('button', { name: 'Editar auxiliar' }));
    await fireEvent.input(screen.getByLabelText('Nova senha'), { target: { value: 'Valor sintético tardio ignorado!' } });
    pending.resolve({ reauthToken: 'synthetic-reauth' });
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(api.put).toHaveBeenCalledWith('/admin/assistants/2/password', { password: replacement }, expect.any(Object));
    expect(api.put.mock.calls.some(call => String(call[0]).includes('/3/'))).toBe(false);
  });

  it('does not send a second operation on repeated confirmation/Enter and cannot be dismissed while awaiting a response', async () => {
    const pending = deferred<{ reauthToken: string }>(); api.post.mockReturnValueOnce(pending.promise);
    render(Assistants); await edit(); await openReset(); await confirm();
    expect(screen.getByRole('button', { name: 'Confirmar redefinição' })).toBeDisabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar redefinição' }));
    await fireEvent.keyDown(screen.getByLabelText('Senha do administrador'), { key: 'Enter' });
    await fireEvent.keyDown(screen.getByLabelText('Senha do administrador'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument(); expect(api.post).toHaveBeenCalledTimes(1);
    pending.resolve({ reauthToken: 'synthetic-reauth' }); await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
  });

  it('keeps the editor locked until the reset itself completes, and reports success only afterwards', async () => {
    const pending = deferred<unknown>(); api.put.mockReturnValueOnce(pending.promise);
    render(Assistants); await edit(); await openReset(); await confirm();
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(success).not.toHaveBeenCalled(); expect(within(row(3)).getByRole('button', { name: 'Editar auxiliar' })).toBeDisabled();
    pending.resolve({ message: 'ok' }); await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByLabelText('Nova senha')).toHaveValue('');
  });

  it('keeps the rejected confirmation visible without a reset or success and permits retry for the same target', async () => {
    api.post.mockRejectedValueOnce({ response: { status: 401, data: { code: 'ADMIN_REAUTH_PASSWORD_INVALID', error: 'Senha administrativa incorreta.' } } });
    render(Assistants); await edit(); await openReset(); await confirm();
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha administrativa incorreta.');
    expect(api.put).not.toHaveBeenCalled(); expect(success).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar redefinição' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(api.put.mock.calls[0][0]).toBe('/admin/assistants/2/password');
  });

  it('requires a new, clearly identified confirmation after cancelling and selecting a different assistant', async () => {
    render(Assistants); await edit(); await openReset();
    await fireEvent.input(screen.getByLabelText('Senha do administrador'), { target: { value: adminPassword } });
    await fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    await edit(3); const dialog = await openReset();
    expect(dialog).toHaveTextContent('ID 3'); expect(screen.getByLabelText('Senha do administrador')).toHaveValue('');
    await confirm(); await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls[0][1].targetAdminId).toBe(3); expect(api.put.mock.calls[0][0]).toBe('/admin/assistants/3/password');
  });

  it('does not start a reset when the component was left before reauthentication completed', async () => {
    const pending = deferred<{ reauthToken: string }>(); api.post.mockReturnValueOnce(pending.promise);
    const ui = render(Assistants); await edit(); await openReset(); await confirm(); await ui.unmount();
    pending.resolve({ reauthToken: 'synthetic-reauth' }); await pending.promise; await Promise.resolve();
    expect(api.put).not.toHaveBeenCalled(); expect(success).not.toHaveBeenCalled();
  });

  it('shows a stale/server reset failure and never presents success', async () => {
    api.put.mockRejectedValueOnce({ response: { status: 409, data: { error: 'A conta do auxiliar mudou. Confirme novamente.' } } });
    render(Assistants); await edit(); await openReset(); await confirm();
    expect(await screen.findByRole('alert')).toHaveTextContent('A conta do auxiliar mudou.'); expect(success).not.toHaveBeenCalled();
  });

  it('allows Escape before submitting and does not send the password', async () => {
    render(Assistants); await edit(); await openReset(); await fireEvent.keyDown(screen.getByLabelText('Senha do administrador'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(api.post).not.toHaveBeenCalled();
  });

  it('uses the same masked dialog for assistant deactivation without a native password prompt', async () => {
    render(Assistants); await screen.findByText(fixtures[0].email);
    await fireEvent.click(within(row(2)).getByRole('button', { name: 'Desativar auxiliar' }));
    expect(screen.getByRole('dialog', { name: 'Desativar auxiliar' })).toHaveTextContent('ID 2');
    await fireEvent.input(screen.getByLabelText('Senha do administrador'), { target: { value: adminPassword } });
    await fireEvent.click(screen.getByRole('button', { name: 'Desativar conta' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls[0][1]).toEqual({ password: adminPassword }); expect(api.delete.mock.calls[0][0]).toBe('/admin/assistants/2');
  });
});
