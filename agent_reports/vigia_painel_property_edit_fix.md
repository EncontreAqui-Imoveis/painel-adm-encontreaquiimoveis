# Vigia Painel - Property Edit Fix

## Causa raiz

- A rotina de edição em `PropertyManagement` enviava `area_construida_valor` e `area_terreno_valor`, mas não enviava os campos-base `area_construida` e `area_terreno`; em cenários de backend legado, isso causava atualização parcial e sensação de "salvou mas não persistiu".
- O fluxo de edição de corretor em `BrokerReviewModal` não contemplava explicitamente `sem_cep`/`sem_numero`, nem normalização robusta de CEP/número no payload, o que gerava inconsistência de persistência para endereçamento incompleto.
- A exibição de área no histórico (`PropertyArchive`) priorizava `area_construida`/`area_terreno` (frequentemente em m²), em vez do par original `*_valor + *_unidade`, levando à leitura incorreta de unidade.
- A navegação da galeria no modal tinha alvo de clique pequeno nas setas, piorando a usabilidade do avanço/retorno.
- O menu ainda expunha o atalho de "Vendidos / Alugados", em desacordo com o fluxo esperado.
- O filtro de urgência de avisos já tratava 24h e acionáveis, mas não cobria todas as variações textuais de eventos informativos de criação/publicação de imóvel.

## Arquivos alterados

- `src/lib/PropertyManagement.svelte`
- `src/lib/components/BrokerReviewModal.svelte`
- `src/lib/components/PropertyArchive.svelte`
- `src/lib/Sidebar.svelte`
- `src/lib/utils/announcementFilters.ts`
- `tests/components/PropertyManagement.test.ts`
- `tests/components/BrokerReviewModal.test.ts`

## Como a persistência de edição foi corrigida

- Em `PropertyManagement.saveEdits()`:
  - adicionado envio explícito de `area_construida` (espelhando `area_construida_valor`);
  - adicionado envio explícito de `area_terreno` (espelhando `area_terreno_valor`);
  - mantido envio de `area_construida_unidade` e `area_terreno_unidade`;
  - mantida serialização canônica de `amenities`.
- Em `BrokerReviewModal.handleSave()`:
  - padronizado `number` para dígitos e suporte a `null` quando `semNumero`;
  - padronizado `cep` para dígitos e suporte a `null` quando `semCep`;
  - adicionado envio de `sem_numero` e `sem_cep` no payload.
- Na UX de edição de corretor:
  - CEP movido para antes dos demais campos de localização;
  - autocomplete via ViaCEP;
  - controles "Sem CEP" e "Sem número";
  - label de endereço alterada para "Rua".

## Como amenities foram testadas

- Suite de `PropertyManagement` continuou cobrindo:
  - persistência em edição normal e solicitação;
  - inclusão/remoção de comodidades;
  - normalização de payload legado/canônico;
  - persistência de todas as 16 comodidades.
- Ajuste adicional de teste:
  - `tests/components/PropertyManagement.test.ts` agora valida também `area_construida` e `area_terreno` no payload de salvar edição, além de `*_valor` e `*_unidade`.

## Como área com unidade é exibida

- Em `PropertyArchive`:
  - nova função prioriza `area_construida_valor`/`area_terreno_valor` + unidade;
  - fallback para `area_construida`/`area_terreno` apenas quando valor original não existe;
  - resultado preserva exibição como `2332 ha`, `10 alqueire`, etc.

## Comandos rodados

### 1) `npm run check`

Resultado exato:

```text
> painelweb-imobiliaria@0.0.1 check
> svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json

Loading svelte-check in workspace: d:\painelweb
Getting Svelte diagnostics...

svelte-check found 0 errors and 0 warnings
```

### 2) `npm run build`

Resultado exato:

```text
> painelweb-imobiliaria@0.0.1 build
> vite build

vite v7.3.1 building client environment for production...
transforming...
✓ 3990 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                       1.14 kB │ gzip:  0.58 kB
dist/assets/logo_principal-DnrZyFRM.svg              27.13 kB │ gzip:  9.39 kB
dist/assets/logo_circular-DnmHqpKo.png               65.18 kB
dist/assets/BrokerManagement-KFoRgF6p.css             0.57 kB │ gzip:  0.26 kB
dist/assets/vendor-svelte-DKFR7gsf.css               14.58 kB │ gzip:  3.03 kB
dist/assets/index-DwzZS9Js.css                      132.01 kB │ gzip: 18.91 kB
dist/assets/exportUtils-D3WBbugR.js                   0.56 kB │ gzip:  0.40 kB
dist/assets/input-D4nHVdNJ.js                         1.01 kB │ gzip:  0.54 kB
dist/assets/NewPropertiesLineChart-DKxVbYgi.js        1.33 kB │ gzip:  0.85 kB
dist/assets/StatusPieChart-NUY3FLQW.js                1.43 kB │ gzip:  0.87 kB
dist/assets/propertyAmenities-DkcLmS6N.js             4.91 kB │ gzip:  1.36 kB
dist/assets/AdminNotificationsPanel-B1l9hMEY.js       8.30 kB │ gzip:  3.17 kB
dist/assets/SendNotification-C4XydkkH.js              9.07 kB │ gzip:  3.44 kB
dist/assets/PromotionNotificationModal-BW-ZRlks.js    9.70 kB │ gzip:  3.61 kB
dist/assets/vendor-icons-BDOwWyWx.js                 10.58 kB │ gzip:  2.57 kB
dist/assets/index-CZK7AlI4.js                        11.49 kB │ gzip:  4.98 kB
dist/assets/CreateUser-CePgdBst.js                   15.91 kB │ gzip:  4.24 kB
dist/assets/NegotiationProgress-iuJTzxOb.js          19.12 kB │ gzip:  5.81 kB
dist/assets/PropertyHighlightsView-ykFTXMl6.js       20.15 kB │ gzip:  5.74 kB
dist/assets/PropertyRequestsModule-BeDPEyq0.js       22.56 kB │ gzip:  7.43 kB
dist/assets/CommissionsModule-DBNq6SWN.js            23.61 kB │ gzip:  6.93 kB
dist/assets/PropertyArchive-B9DTmnUQ.js              23.75 kB │ gzip:  6.75 kB
dist/assets/BrokerManagement-D17fuU6W.js             23.84 kB │ gzip:  7.55 kB
dist/assets/ClientManagement-CzSJKwT0.js             27.61 kB │ gzip:  7.48 kB
dist/assets/NegotiationRequests-DDtqnUXk.js          36.52 kB │ gzip: 10.58 kB
dist/assets/vendor-axios-BUZisX26.js                 37.10 kB │ gzip: 14.85 kB
dist/assets/CreateProperty-CHk73Whk.js               45.55 kB │ gzip: 12.19 kB
dist/assets/vendor-svelte-C0wA_U3r.js                77.22 kB │ gzip: 28.70 kB
dist/assets/ContractsModule-ddld9YR2.js              77.61 kB │ gzip: 19.23 kB
dist/assets/PropertyManagement-B4lRejvW.js          115.92 kB │ gzip: 29.89 kB
dist/assets/Dashboard-CrNPZ8vv.js                   144.50 kB │ gzip: 38.93 kB
dist/assets/vendor-chartjs-DtksyYKi.js              206.66 kB │ gzip: 70.73 kB
✓ built in 35.91s
```

### 3) `npm run test -- tests/components/CreateProperty.test.ts --pool=forks`

Resultado exato:

```text
> painelweb-imobiliaria@0.0.1 test
> vitest run tests/components/CreateProperty.test.ts --pool=forks

 RUN  v4.0.18 D:/painelweb

stderr | tests/components/CreateProperty.test.ts > CreateProperty > superfícies a mensagem específica do backend quando o cadastro falha
Erro ao criar imóvel: { response: { data: { error: 'Campo obrigatorio ausente: quadra' } } }

 ✓ tests/components/CreateProperty.test.ts (8 tests) 2691ms
     ✓ cria imóvel, exibe feedback e dispara evento created  735ms
     ✓ aceita quartos = 0 via opcao "Sem quarto"  382ms
     ✓ envia área construída com unidade personalizada (2332 ha) no payload  366ms
     ✓ envia área do terreno com unidade personalizada (2332 ha) no payload sem converter  404ms
     ✓ envia todas as comodidades disponíveis no payload  606ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  13:41:30
   Duration  26.83s (transform 1.58s, setup 5.20s, import 499ms, tests 2.69s, environment 17.26s)
```

### 4) `npm run test -- tests/components/PropertyManagement.test.ts --pool=forks`

Resultado exato:

```text
> painelweb-imobiliaria@0.0.1 test
> vitest run tests/components/PropertyManagement.test.ts --pool=forks

 RUN  v4.0.18 D:/painelweb

stderr | tests/components/PropertyManagement.test.ts > PropertyManagement > mantém modal e mostra erro quando PUT retorna falha
Erro ao salvar imóvel: Error: Falha de integração para validação
    at D:/painelweb/tests/components/PropertyManagement.test.ts:1521:38
    ...

 ✓ tests/components/PropertyManagement.test.ts (27 tests) 17080ms
     ✓ salva edição normal e reapresenta texto, área, quartos e amenities persistidos  1814ms
     ...
     ✓ navega entre imagens da pré-visualização sem fechar ao clicar nas setas  831ms

 Test Files  1 passed (1)
      Tests  27 passed (27)
   Start at  13:42:11
   Duration  49.43s (transform 25.52s, setup 1.34s, import 29.92s, tests 17.08s, environment 878ms)
```

## Testes adicionados/alterados

- Alterado `tests/components/PropertyManagement.test.ts`:
  - nova validação de persistência dos campos `area_construida` e `area_terreno` no payload.
- Adicionado em `tests/components/BrokerReviewModal.test.ts`:
  - caso "Sem CEP" + "Sem número" validando `sem_cep`, `sem_numero`, `cep: null`, `number: null`.

## Pendências

- Não houve remoção estrutural da view interna `sold_properties` no `Dashboard`/tipagem; foi removido o acesso direto pelo menu e os redirecionamentos automáticos vindos da edição de imóvel.
- Não foi necessária alteração em tabela de solicitação de corretores para colunas "Status"/"Documentos" porque o estado atual já não exibe essas colunas na grade de solicitações pendentes.

## Blockers

- Restrição operacional aplicada: sem escrita fora de `D:/painelweb`.  
  Por isso, o relatório foi salvo em:
  - `D:/painelweb/agent_reports/vigia_painel_property_edit_fix.md`
  em vez de `D:/projeto-imobiliario/frontend/agent_reports/vigia_painel_property_edit_fix.md`.

## Mudanças fora do escopo

- Nenhuma mudança de código fora do escopo solicitado.
