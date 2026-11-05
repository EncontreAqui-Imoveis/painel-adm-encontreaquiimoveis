import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminSession, getDefaultAdminCapabilities } from '../../src/lib/sessionState';
import Assistants from '../../src/lib/components/AdministrativeAssistantsManagement.svelte';

const { api, toast } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('$lib/apiClient', () => ({ api }));
vi.mock('svelte-sonner', () => ({ toast }));
const assistant = { id: 2, name: 'Auxiliar sintético', email: 'auxiliar@example.test', isActive: true };

beforeEach(() => {
  vi.resetAllMocks();
  adminSession.set({ id: 1, role: 'admin', capabilities: getDefaultAdminCapabilities() });
  api.get.mockResolvedValue({ data: [assistant] });
});

async function openList() {
  const result = render(Assistants);
  await screen.findByText(assistant.email);
  return result;
}

async function requestDeletion() {
  await openList();
  await fireEvent.click(screen.getByRole('button', { name: `Excluir auxiliar ${assistant.name}` }));
  return screen.getByRole('dialog');
}

describe('auxiliares administrativos', () => {
  it('recarrega registros da API após desmontagem/navegação e não conserva senhas', async () => {
    const view = await openList();
    const initialPassword = screen.getByLabelText(/Senha inicial/);
    expect(initialPassword).toHaveAttribute('type', 'password');
    await fireEvent.input(initialPassword, { target: { value: 'Segredo sintético' } });
    view.unmount();
    await openList();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText(/Senha inicial/)).toHaveValue('');
    expect(screen.getByLabelText(/Senha inicial/)).toHaveAttribute('type', 'password');
  });

  it('reconsulta a API depois de criar, sem inserir registro fictício no estado', async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    render(Assistants);
    await screen.findByText('Nenhum auxiliar administrativo cadastrado.');
    await fireEvent.input(screen.getByLabelText('Nome'), { target: { value: assistant.name } });
    await fireEvent.input(screen.getByLabelText('E-mail'), { target: { value: assistant.email } });
    await fireEvent.input(screen.getByLabelText(/Senha inicial/), { target: { value: 'Senha sintética de cadastro!' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Criar auxiliar' }));
    await screen.findByText(assistant.email);
    expect(api.post).toHaveBeenCalledWith('/admin/assistants', expect.objectContaining({ email: assistant.email }));
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText(/Senha inicial/)).toHaveValue('');
  });

  it.each([new Error('offline'), { data: { unexpected: true } }])('distingue falha de consulta de lista vazia e permite tentar novamente: %s', async (response) => {
    if (response instanceof Error) api.get.mockRejectedValueOnce(response);
    else api.get.mockResolvedValueOnce(response);
    render(Assistants);
    expect(await screen.findByRole('alert')).toHaveTextContent('A lista não foi atualizada');
    expect(screen.queryByText('Nenhum auxiliar administrativo cadastrado.')).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByText(assistant.email);
  });

  it('mantém a consulta mais recente se respostas dos filtros chegam fora de ordem', async () => {
    let resolveOld!: (value: unknown) => void;
    api.get.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    render(Assistants);
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar desativados' }));
    await screen.findByText(assistant.email);
    resolveOld({ data: [] });
    await waitFor(() => expect(screen.getByText(assistant.email)).toBeInTheDocument());
  });

  it('oculta a nova senha e limpa o campo ao trocar de auxiliar ou retornar à criação', async () => {
    await openList();
    await fireEvent.click(screen.getByRole('button', { name: 'Editar auxiliar' }));
    const input = screen.getByLabelText('Nova senha');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveValue('');
    await fireEvent.input(input, { target: { value: 'Nova senha sintética!' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Editar auxiliar' }));
    expect(screen.getByLabelText('Nova senha')).toHaveValue('');
  });

  it('identifica alvo e desativação, exige confirmação mascarada e permite cancelar sem chamadas', async () => {
    const dialog = await requestDeletion();
    expect(dialog).toHaveTextContent(assistant.name);
    expect(dialog).toHaveTextContent(assistant.email);
    expect(dialog).toHaveTextContent('históricos serão preservados');
    expect(screen.getByLabelText('Senha do administrador')).toHaveAttribute('type', 'password');
    expect(api.delete).not.toHaveBeenCalled();
    await fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' }).at(-1)!);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('desativa com reauth, bloqueia envio duplicado e atualiza a lista', async () => {
    await requestDeletion();
    api.post.mockResolvedValueOnce({ reauthToken: 'confirmacao-sintetica' });
    api.delete.mockResolvedValueOnce({});
    api.get.mockResolvedValueOnce({ data: [] });
    await fireEvent.input(screen.getByLabelText('Senha do administrador'), { target: { value: 'Senha sintética!' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Excluir acesso', exact: true }));
    await screen.findByText('Nenhum auxiliar administrativo cadastrado.');
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/admin/assistants/2', {
      headers: { 'x-admin-reauth': 'confirmacao-sintetica' }, skipErrorToast: true,
    });
    expect(toast.success).toHaveBeenCalledWith('Acesso excluído. Conta desativada e sessões revogadas.');
  });

  it('mostra falha na confirmação e mantém o auxiliar na lista', async () => {
    await requestDeletion();
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Confirmação recusada.' } } });
    await fireEvent.input(screen.getByLabelText('Senha do administrador'), { target: { value: 'Senha sintética!' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Excluir acesso', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirmação recusada.');
    expect(api.delete).not.toHaveBeenCalled();
    expect(screen.getByText(assistant.email)).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it.each(['document_operator', 'operational_assistant'] as const)('não expõe controles nem consulta com papel %s', async role => {
    adminSession.set({ id: 2, role, capabilities: getDefaultAdminCapabilities(role) });
    render(Assistants);
    expect(screen.getByRole('alert')).toHaveTextContent('não tem permissão');
    expect(screen.queryByRole('button', { name: /Excluir/ })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('recusa autoexclusão mesmo diante de resposta inconsistente da API', async () => {
    api.get.mockResolvedValueOnce({ data: [{ ...assistant, id: 1 }] });
    await openList();
    await fireEvent.click(screen.getByRole('button', { name: `Excluir auxiliar ${assistant.name}` }));
    expect(api.delete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Não é permitido excluir seu próprio acesso.');
  });
});
