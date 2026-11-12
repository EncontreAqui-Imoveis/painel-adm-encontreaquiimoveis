import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import Fields from './fixtures/PasswordFields.svelte';

it('olhos independentes preservam valor UTF-8/espacos, atributos e formulario', async () => {
  const submit = vi.fn(); render(Fields, { submit });
  const first = screen.getByLabelText('Primeira'), second = screen.getByLabelText('Segunda');
  const value = '  Texto sintético 🔐  ';
  await fireEvent.input(first, { target: { value } });
  await fireEvent.input(second, { target: { value } });
  expect(first).toHaveAttribute('type', 'password'); expect(second).toHaveAttribute('type', 'password');
  const eye = screen.getByRole('button', { name: 'Mostrar primeira senha' });
  expect(eye).toHaveAttribute('type', 'button'); expect(eye).toHaveAttribute('aria-controls', 'first');
  await fireEvent.click(eye);
  expect(first).toHaveAttribute('type', 'text'); expect(second).toHaveAttribute('type', 'password');
  expect(first).toHaveValue(value); expect(second).toHaveValue(value);
  await fireEvent.click(screen.getByRole('button', { name: 'Ocultar primeira senha' }));
  expect(first).toHaveAttribute('type', 'password'); expect(first).toHaveValue(value);
  expect(first).toHaveAttribute('minlength', '14'); expect(first).toHaveAttribute('autocomplete', 'new-password');
  expect(submit).not.toHaveBeenCalled();
});
