import { describe, expect, it } from 'vitest';

import {
  getDocumentsForMatrixCell,
  getMatrixRows,
  resolveMatrixUploadCategory,
} from '../../src/lib/components/contracts/contractsMatrixHelpers';
import type { ContractItem } from '../../src/lib/components/contracts/types';

const contract: ContractItem = {
  id: 'contract-1',
  status: 'AWAITING_DOCS',
  negotiationId: 'negotiation-1',
  propertyId: 1,
  documentRequirements: {
    seller: [
      { category: 'dados_bancarios', applicability: 'required' },
      { category: 'outro', applicability: 'optional' },
    ],
    buyer: [{ category: 'outro', applicability: 'optional' }],
  },
  documents: [
    {
      id: 1,
      documentType: 'outro',
      side: 'seller',
      originalFileName: 'dados-bancarios-legado.pdf',
      metadata: { documentCategory: 'dados_bancarios' },
    },
    {
      id: 2,
      documentType: 'outro',
      side: 'seller',
      originalFileName: 'anexo-livre.pdf',
    },
  ],
};

describe('contractsMatrixHelpers', () => {
  it('mantém Dados Bancários separado de Outro e reconhece o upload legado', () => {
    const rows = getMatrixRows(contract);
    const bankRow = rows.find((row) => row.documentType === 'dados_bancarios');
    const otherRow = rows.find((row) => row.documentType === 'outro');

    expect(bankRow).toMatchObject({ sellerRequired: true, buyerRequired: false });
    expect(otherRow).toMatchObject({ sellerRequired: true, buyerRequired: true });
    expect(getDocumentsForMatrixCell(contract, 'dados_bancarios', 'seller')).toHaveLength(1);
    expect(getDocumentsForMatrixCell(contract, 'outro', 'seller')).toHaveLength(1);
    expect(resolveMatrixUploadCategory('dados_bancarios', 'seller')).toBe('dados_bancarios');
  });
});
