import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import ContractSignedReplacementPanel from '../../src/lib/components/contracts/ContractSignedReplacementPanel.svelte';

const pdf = () => new File(['%PDF-test'], 'signed.pdf', { type: 'application/pdf' });
describe('ContractSignedReplacementPanel', () => {
  it('starts with no declaration and requires reason and a PDF', async () => {
    const onSubmit = vi.fn();
    const { rerender } = render(ContractSignedReplacementPanel, { canDeclareEquivalence: true, onSubmit });
    expect(screen.getAllByRole('radio').every((input) => !(input as HTMLInputElement).checked)).toBe(true);
    const button = screen.getByRole('button', { name: 'Substituir PDF assinado' });
    await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Nova digitalização' } });
    await fireEvent.click(screen.getByRole('radio', { name: /sem equivalência/ }));
    expect(button).toBeDisabled();
    await rerender({ file: new File(['png'], 'signed.png', { type: 'image/png' }) }); expect(button).toBeDisabled();
    await rerender({ file: pdf() }); expect(button).toBeEnabled();
    await fireEvent.input(screen.getByRole('textbox'), { target: { value: ' ' } }); expect(button).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it.each([true, false])('explicitly declares replacement, equivalence allowed: %s', async (principal) => {
    const onSubmit = vi.fn();
    render(ContractSignedReplacementPanel, { file: pdf(), canDeclareEquivalence: principal, onSubmit });
    await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Nova digitalização' } });
    await fireEvent.click(screen.getByRole('radio', { name: principal ? /Declaro equivalência:/ : /sem equivalência/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Substituir PDF assinado' }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(principal
      ? { replacementReason: 'Nova digitalização', equivalenceDeclared: true }
      : { replacementReason: 'Nova digitalização', contractContentUnchanged: true });
  });
  it('removes equivalence when titular permission is lost', async () => {
    const onSubmit = vi.fn();
    const { rerender } = render(ContractSignedReplacementPanel, { file: pdf(), canDeclareEquivalence: true, onSubmit });
    await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Nova digitalização' } });
    await fireEvent.click(screen.getByRole('radio', { name: /Declaro equivalência:/ }));
    await rerender({ canDeclareEquivalence: false });
    expect(screen.queryByRole('radio', { name: /Declaro equivalência:/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Substituir PDF assinado' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it('blocks content changes, without invoking upload, and is accessible', async () => {
    const onSubmit = vi.fn();
    const { container } = render(ContractSignedReplacementPanel, { file: pdf(), canDeclareEquivalence: true, onSubmit });
    await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Alteração contratual' } });
    await fireEvent.click(screen.getByRole('radio', { name: 'O conteúdo contratual mudou.' }));
    expect(screen.getByRole('alert')).toHaveTextContent('nova revisão da minuta');
    expect(screen.getByRole('button', { name: 'Substituir PDF assinado' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
  });
});
