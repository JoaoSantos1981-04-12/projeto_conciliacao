# Dossiê de Validação — Contador Sênior

> **Objetivo:** obter o aval do Contador Sênior **antes** de implementar o engine de
> conciliação (Sprint B). Abaixo estão (A) os achados do parser que precisam de confirmação
> contábil e (B) as regras de matching com as premissas a validar. Base: razão real da
> **HAILO SISTEMAS METALICOS LTDA**, conta `1.1.02.0101.100005 – DOMESTIC CUSTOMERS`,
> período 01/01/2026 a 31/05/2026 (165 lançamentos).

---

## A. Achados do parser que exigem confirmação

| # | Achado | Status | Pergunta ao Contador |
|---|---|---|---|
| 1 | Período fica no índice 6 da linha de título (não na última coluna) | Tratado | Apenas técnico — sem ação contábil |
| 2 | Saldo anterior fica ao lado do rótulo `SALDO ANTERIOR:` | Tratado | Apenas técnico |
| 3 | Histórico usa espaço duplo (`CR  BAIXA…`) | Tratado | Apenas técnico |
| 4 | **DÉBITO/CRÉDITO vêm em CENTAVOS; SALDO em REAIS** | ⚠️ **PENDENTE** | **Ver A.1 abaixo** |
| 5 | Regex de complemento corrigido (CNPJ/CPF, `DUP:`) | Tratado | Apenas técnico |

### A.1 — Escala de valores (CRÍTICO)

No arquivo, as colunas **DÉBITO** e **CRÉDITO** vêm como inteiro com sufixo `,00`
(ex.: `859250,00`), mas o valor real é **R$ 8.592,50** — ou seja, **em centavos**.
A coluna **SALDO** vem em reais com decimais reais (ex.: `1701195,33`).

**Prova:** a identidade contábil `saldo = saldo_anterior + débito − crédito` só fecha
dividindo débito/crédito por 100 — e fecha em **165 de 165** lançamentos.

**Perguntas:**
1. Essa convenção (débito/crédito em centavos, saldo em reais) é **padrão do ERP** e vale
   para **todas as contas/empresas**, ou é específica desta exportação?
2. Há risco de alguma exportação trazer débito/crédito **já em reais**? Se sim, precisamos
   de um indicador no arquivo para distinguir (hoje assumimos sempre centavos).

---

## B. Modelo de conciliação — evidência nos dados reais

A conta é um **ativo a receber** (clientes domésticos). A análise mostrou que os pares se
formam **dentro da própria conta**, pela duplicata:

- 90 lançamentos com débito, 75 com crédito, 163 com `dupCr`.
- **63 duplicatas aparecem nos dois lados** (um débito e um crédito) → candidatas a par exato.

**Exemplo real (duplicata 1070):**

| Natureza | Débito | Crédito | Data | OF | ID Baixa |
|---|---|---|---|---|---|
| NF (gera o título) | R$ 1.280,50 | — | 19/03/2026 | 8807 | — |
| Baixa de cliente | — | R$ 1.280,50 | 26/03/2026 | 8807 | 2459 |

Mesma `dupCr`, mesma `parcela`, mesma `OF`, direções opostas, **valores idênticos**.

**Perguntas:**
3. Confirma que a conciliação é **intra-conta** (NF de um lado, baixa do outro, mesma
   duplicata)? Ou em algum momento será **razão × extrato bancário / outra fonte**?
4. As ~39 duplicatas sem par (título em aberto ou baixa de período anterior) devem ficar
   como **PENDENTE** ou viram **DIVERGÊNCIA** após algum prazo?

---

## C. Regras de matching — premissas a validar

As regras abaixo virão do CLAUDE.md. Antes de codar, confirmar pesos, tolerâncias e direções.

| Regra | Critério | Tolerância | Peso | Confirmar? |
|---|---|---|---|---|
| 1 — Duplicata exata | `dupCr` + `parcela` iguais, direções opostas, valores iguais | ≤ **R$ 0,02** | 1.00 | Tolerância ok? |
| 2 — ID de baixa | `idBaixa` + `doctoBaixa` iguais, direções opostas | — | 0.95 | Faz sentido p/ esta conta? |
| 3 — OF + valor | `OF` igual, valores próximos, datas próximas | **≤ 0,5%** e **≤ 30 dias** | 0.85 | % e janela ok? |
| 4 — CNPJ + valor + período | `cnpjParceiro` igual, valores iguais, mesmo mês | ≤ **R$ 1,00** | 0.70 | "Mês" = competência? |

**Perguntas:**
5. **"Mesmo mês de competência"** (Regra 4) deve usar a **data de lançamento** ou a **data de
   vencimento** (`VCTO`)? No exemplo 1070 as datas de lançamento diferem 7 dias e o
   vencimento difere mais — isso muda o resultado.
6. **Direção:** confirmamos que o lado **débito** é o que **gera o título** (NF) e o **crédito**
   é a **baixa**? (No exemplo, o débito é uma `NF_ENTRADA` — a nomenclatura do histórico
   confunde; queremos a regra contábil, não o rótulo.)
7. Pares aprovados **automaticamente** (Regras 1 e 2) podem dispensar revisão humana, ou
   **todo** par precisa de aprovação antes de marcar como CONCILIADO?

---

## D. Divergências automáticas — operacionalização

O CLAUDE.md prevê marcar como `DIVERGENCIA` quando:
- `dupCr` preenchido sem contrapartida **após 30 dias**;
- saldo credor em conta de ativo sem par;
- diferença de valor > 0,5% entre pareados.

**Perguntas:**
8. Os **30 dias** contam a partir da **data de lançamento**, do **vencimento**, ou da **data de
   fechamento do período** (ex.: 31/05/2026)?
9. "Saldo credor em conta de ativo" — como o Contador quer ver isso na tela (alerta na conta,
   não no lançamento individual)?

---

## E. Checklist de sign-off

- [ ] A.1 — Regra de centavos confirmada (ou ajustada)
- [ ] B — Modelo intra-conta confirmado; tratamento de duplicatas sem par definido
- [ ] C — Pesos, tolerâncias e direções das Regras 1–4 confirmados
- [ ] C.5 — Base de "competência" (lançamento vs vencimento) definida
- [ ] C.7 — Política de aprovação (automática vs revisão obrigatória) definida
- [ ] D.8 — Referência dos 30 dias definida

> Após o sign-off, atualizar `docs/regras-matching.md` e iniciar `src/lib/engine/`
> (`rules.ts` → `matcher.ts` → testes), conforme o Sprint B.
