import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, expect, it, vi } from 'vitest';
import Login from '../../src/lib/Login.svelte';
const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock('$lib/adminSessionService', () => ({ requestAdminLogin: login }));
beforeEach(() => { vi.clearAllMocks(); login.mockReturnValue(new Promise(() => {})); });
it('uma confirmacao por Enter nao envia dois logins concorrentes', async () => {
  render(Login);
  await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'synthetic@example.test' } });
  const password = screen.getByLabelText('Senha');
  await fireEvent.input(password, { target: { value: '  Senha sintetica de teste!  ' } });
  await fireEvent.keyPress(password, { key: 'Enter', charCode: 13 });
  await fireEvent.submit(password.closest('form')!);
  expect(login).toHaveBeenCalledTimes(1);
});
