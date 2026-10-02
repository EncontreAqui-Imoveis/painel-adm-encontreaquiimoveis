import { describe, expect, it } from 'vitest';

import {
  computeApprovalLockReasonsForSide,
  getDocumentsForMatrixCell,
  getMatrixRows,
  listMissingRequiredDocuments,
  resolveMatrixUploadCategory,
} from '../../src/lib/components/contracts/contractsMatrixHelpers';
import { documentLabel } from '../../src/lib/components/contracts/contractsDisplayHelpers';
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
  const rentalContractWithMatrix: ContractItem = {
    id: 'contract-rental-1',
    status: 'AWAITING_DOCS',
    negotiationId: 'negotiation-rental-1',
    propertyId: 2,
    dealType: 'rent',
    sellerInfo: {
      estado_civil: 'Solteiro(a)',
      profissao: 'Locador',
      dados_bancarios: 'Banco',
    },
    buyerInfo: {
      estado_civil: 'Solteiro(a)',
      profissao: 'Locatário',
      garantia_locacao: 'Caução',
    },
    documentRequirementMatrix: {
      seller: [
        {
          category: 'identidade',
          applicability: 'required',
          preferredDocumentType: 'doc_identidade',
        },
      ],
      buyer: [
        {
          category: 'comprovante_endereco',
          applicability: 'required',
          preferredDocumentType: 'comprovante_endereco',
        },
      ],
    },
    documents: [],
  };

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

  it('prioriza a matriz canônica de locação sem inferir a finalidade textual do imóvel', () => {
    const rentalContract: ContractItem = {
      ...contract,
      dealType: 'rent',
      propertyPurpose: 'Venda e aluguel',
      documentRequirementMatrix: {
        seller: [
          {
            category: 'seguro_incendio',
            applicability: 'required',
            preferredDocumentType: 'seguro_incendio',
          },
          {
            category: 'dados_bancarios',
            applicability: 'required',
            preferredDocumentType: 'dados_bancarios',
          },
        ],
        buyer: [
          {
            category: 'comprovante_renda',
            applicability: 'required',
            preferredDocumentType: 'comprovante_renda',
          },
          {
            category: 'outro',
            applicability: 'optional',
            preferredDocumentType: 'outro',
          },
        ],
      },
    };

    const rows = getMatrixRows(rentalContract);
    expect(rows.find((row) => row.documentType === 'dados_bancarios')).toMatchObject({
      sellerRequired: true,
      buyerRequired: false,
    });
    expect(rows.find((row) => row.documentType === 'seguro_incendio')).toMatchObject({
      sellerRequired: true,
      buyerRequired: false,
    });
    expect(rows.find((row) => row.documentType === 'comprovante_renda')).toMatchObject({
      sellerRequired: false,
      buyerRequired: true,
    });
    expect(rows.find((row) => row.documentType === 'certidao_onus_acoes')).toBeUndefined();
  });

  it('não bloqueia nenhum lado por documentos compartilhados de etapas futuras', () => {
    const rentalWithFutureDocuments: ContractItem = {
      ...rentalContractWithMatrix,
      documents: [
        {
          id: 11,
          documentType: 'contrato_assinado',
          status: 'PENDING',
          side: null,
        },
        {
          id: 12,
          documentType: 'contrato_minuta',
          status: 'PENDING',
          side: null,
        },
        {
          id: 13,
          documentType: 'comprovante_pagamento',
          status: 'PENDING',
          side: null,
        },
      ],
    };

    expect(computeApprovalLockReasonsForSide(rentalWithFutureDocuments, 'seller')).not.toEqual(
      expect.arrayContaining([expect.stringContaining('Contrato Assinado')])
    );
    expect(computeApprovalLockReasonsForSide(rentalWithFutureDocuments, 'buyer')).not.toEqual(
      expect.arrayContaining([expect.stringContaining('Contrato Assinado')])
    );
    expect(computeApprovalLockReasonsForSide(rentalWithFutureDocuments, 'seller')).not.toEqual(
      expect.arrayContaining([expect.stringContaining('Contrato (Minuta)')])
    );
    expect(computeApprovalLockReasonsForSide(rentalWithFutureDocuments, 'buyer')).not.toEqual(
      expect.arrayContaining([expect.stringContaining('Comprovante de Pagamento')])
    );
  });

  it('separa documento pendente enviado como item para análise', () => {
    const rentalWithPendingSellerIdentity: ContractItem = {
      ...rentalContractWithMatrix,
      documents: [
        {
          id: 14,
          documentType: 'doc_identidade',
          status: 'PENDING',
          side: 'seller',
        },
      ],
    };

    expect(
      computeApprovalLockReasonsForSide(rentalWithPendingSellerIdentity, 'seller')
    ).toContain('Documentos (Locador) para análise: Documento Pessoal');
    expect(
      computeApprovalLockReasonsForSide(rentalWithPendingSellerIdentity, 'seller')
    ).not.toEqual(expect.arrayContaining([expect.stringContaining('bloqueados')]));
    expect(
      computeApprovalLockReasonsForSide(rentalWithPendingSellerIdentity, 'buyer')
    ).not.toEqual(expect.arrayContaining([expect.stringContaining('Documento Pessoal: pendente')]));
  });

  it('usa Seguro Incêndio em toda apresentação da categoria', () => {
    const rentalWithMissingInsurance: ContractItem = {
      ...rentalContractWithMatrix,
      documentRequirementMatrix: {
        seller: [
          {
            category: 'seguro_incendio',
            applicability: 'required',
            preferredDocumentType: 'seguro_incendio',
          },
        ],
        buyer: [],
      },
    };

    expect(documentLabel('seguro_incendio')).toBe('Seguro Incêndio');
    expect(listMissingRequiredDocuments(rentalWithMissingInsurance)).toContain(
      'Seguro Incêndio (Locador)'
    );
    expect(computeApprovalLockReasonsForSide(rentalWithMissingInsurance, 'seller')).toContain(
      'Documentos (Locador) faltando: Seguro Incêndio'
    );
  });
});
