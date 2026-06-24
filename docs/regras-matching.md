# Regras de Matching — Fase 1 (validado com Contador Sênior)

> Decisões confirmadas pelo Contador Sênior (jun/2026). Estas regras guiam
> `src/lib/engine/`. Mudanças aqui exigem novo aval contábil.

## Decisões confirmadas

| # | Tema | Decisão |
|---|---|---|
| 1 | Escala de valores | Débito/crédito em **centavos**, saldo em **reais** — **padrão do ERP**, vale para todas as contas |
| 2 | Escopo da conciliação | **Fase 1 = intra-conta** (NF × baixa, mesma duplicata). Extrato bancário fica para fase posterior |
| 3 | Lançamento sem par | Fica **PENDENTE** (não vira divergência por idade) |
| 4 | "Mês de competência" | Base é a **data de lançamento** |
| 5 | Aprovação | Pares **exatos** (Regras 1 e 2) dispensam revisão → aprovados automaticamente, mas ficam **acessíveis** para revisão facultativa. Pares fuzzy/manuais (Regras 3 e 4) entram para revisão |
| 6 | Janela de 30 dias | Conta a partir da **data de lançamento** (usada na proximidade da Regra 3) |
| 7 | Tolerância de valor | **R$ 0,02 única** para todas as regras (substitui 0,5% e R$ 1,00) |

## Regras (ordem de prioridade)

| Regra | Critério | Tolerância | Peso | Tipo | Aprovação |
|---|---|---|---|---|---|
| 1 — Duplicata exata | `dupCr` + `parcela` iguais, direções opostas, valores iguais | ≤ R$ 0,02 | 1.00 | `AUTOMATICO_EXATO` | Automática |
| 2 — ID de baixa | `idBaixa` + `doctoBaixa` iguais, direções opostas, valores iguais | ≤ R$ 0,02 | 0.95 | `AUTOMATICO_EXATO` | Automática |
| 3 — OF + valor + data | `ordemFaturamento` igual, direções opostas, valores iguais, datas ≤ 30 dias | ≤ R$ 0,02 / 30 dias | 0.85 | `AUTOMATICO_FUZZY` | Revisão facultativa |
| 4 — CNPJ + valor + competência | `cnpjParceiro` igual, direções opostas, valores iguais, mesmo mês de lançamento | ≤ R$ 0,02 | 0.70 | `MANUAL` | Revisão |

> Nota: na fase 1 (intra-conta) a Regra 2 raramente dispara, pois o lado da NF não
> carrega `idBaixa`/`doctoBaixa`. Mantida para a fase de extrato.

## Divergências (fase 1)

- **Valor divergente na mesma duplicata:** existem título (débito) e baixa (crédito) com
  `dupCr` + `parcela` iguais, mas a diferença de valor excede R$ 0,02 → `DIVERGENCIA`.
- Demais lançamentos sem par → `PENDENTE` (decisão #3).

## Algoritmo

1. Gera todos os pares candidatos (i<j) e avalia pelas Regras 1→4 (primeira que casar vence).
2. Ordena candidatos por **score desc**, depois **menor diferença de valor**.
3. Atribuição **gulosa**: cada lançamento entra em no máximo um par.
4. Entre os não pareados, detecta divergências de valor por duplicata; o restante fica PENDENTE.
