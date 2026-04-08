# Smoke Checklist Admin

## Objetivo
Validar manualmente os fluxos administrativos que dependem de dados reais e comportamento integrado do backend.

## Fluxos
1. Login admin
- Entrar no painel
- Evidência esperada: dashboard carregado com sidebar e métricas sem erro fatal

2. Contratos
- Abrir `/admin/contratos`
- Entrar em um contrato `AWAITING_DOCS`
- Evidência esperada: modal de revisão com dados e documentos

3. Solicitações de imóveis
- Abrir `Solicitações (Imóveis)`
- Alternar entre abas `Criação` e `Edição`
- Evidência esperada: filas separadas carregando sem erro 500

4. Revisão de edição de imóvel
- Abrir uma solicitação na aba `Edição`
- Rever um campo, aprovar ou rejeitar
- Evidência esperada: modal abre com comparação `Antes/Depois` e resposta da API é refletida na fila

5. Logout admin
- Sair pela sidebar
- Evidência esperada: retorno à tela de login e sessão local limpa

## Registro
- Anotar ambiente
- Anotar data/hora
- Salvar screenshot de cada etapa crítica
- Registrar request id quando houver falha de API
