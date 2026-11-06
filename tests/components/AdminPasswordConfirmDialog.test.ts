import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Dialog from '../../src/lib/components/AdminPasswordConfirmDialog.svelte';

describe('visibilidade da senha na confirmação administrativa', () => {
  it('inicia mascarada e alterna sem perder o valor ou confirmar a ação', async () => {
    const confirm = vi.fn();
    render(Dialog, { props: { open: true }, events: { confirm } });
    const input = screen.getByLabelText('Senha do administrador');
    await fireEvent.input(input, { target: { value: '  Texto sintético de teste!  ' } });
    expect(input).toHaveAttribute('type', 'password');
    const show = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(show).toHaveAttribute('type', 'button');
    await fireEvent.click(show);
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('  Texto sintético de teste!  ');
    await fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveValue('  Texto sintético de teste!  ');
    expect(confirm).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar', exact: true }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0].detail.password).toBe('  Texto sintético de teste!  ');
  });

  it('volta a ocultar e limpa a senha ao fechar e reabrir', async () => {
    const view = render(Dialog, { open: true });
    await fireEvent.input(screen.getByLabelText('Senha do administrador'), { target: { value: 'Texto sintético de teste!' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    await view.rerender({ open: false });
    await view.rerender({ open: true });
    expect(screen.getByLabelText('Senha do administrador')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Senha do administrador')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeInTheDocument();
  });

  it('bloqueia o botão durante envio, como o campo existente', async () => {
    render(Dialog, { open: true, isSubmitting: true });
    expect(screen.getByLabelText('Senha do administrador')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeDisabled();
  });
});
