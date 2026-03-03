import { render, screen } from '@testing-library/svelte';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import Login from '../../src/lib/Login.svelte';

describe('Login accessibility', () => {
  it('exposes labeled inputs and no basic axe violations in the login shell', async () => {
    const { container } = render(Login);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();

    const result = await axe.run(container, {
      rules: {
        'color-contrast': {
          enabled: false,
        },
      },
    });
    expect(result.violations).toHaveLength(0);
  });
});
