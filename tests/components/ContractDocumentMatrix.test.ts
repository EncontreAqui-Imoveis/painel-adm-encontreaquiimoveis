import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import ContractDocumentMatrix from '../../src/lib/components/contracts/ContractDocumentMatrix.svelte';

describe('ContractDocumentMatrix', () => {
  it('trata aprovação com ressalvas como documento bloqueado', () => {
    render(ContractDocumentMatrix, {
      rows: [
        {
          documentType: 'doc_identidade',
          sellerRequired: true,
          buyerRequired: false,
          sellerDocs: [
            {
              id: 42,
              documentType: 'doc_identidade',
              side: 'seller',
              status: 'APPROVED_WITH_RES',
              originalFileName: 'identidade-com-ressalvas.pdf',
            },
          ],
          buyerDocs: [],
        },
      ],
      documentLabel: () => 'Documento Pessoal',
      documentFileName: (doc: { originalFileName?: string | null }) =>
        doc.originalFileName ?? 'Documento',
      documentStatusLabel: () => 'Aprovado com ressalvas',
      documentStatusClass: () => 'bg-amber-100 text-amber-800',
      onDownload: vi.fn(),
    });

    const documentCard = screen
      .getByRole('button', { name: 'identidade-com-ressalvas.pdf' })
      .parentElement?.parentElement;

    expect(documentCard).not.toBeNull();
    const card = within(documentCard as HTMLElement);
    expect(card.getByLabelText('Baixar documento aprovado')).toBeInTheDocument();
    expect(card.queryByLabelText('Editar documento')).not.toBeInTheDocument();
    expect(card.queryByLabelText('Aprovar documento')).not.toBeInTheDocument();
    expect(card.queryByLabelText('Rejeitar documento')).not.toBeInTheDocument();
  });
});
