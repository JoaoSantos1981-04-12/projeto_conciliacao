-- CreateEnum
CREATE TYPE "ImportacaoStatus" AS ENUM ('PROCESSANDO', 'CONCLUIDA', 'ERRO');

-- CreateEnum
CREATE TYPE "StatusConciliacao" AS ENUM ('PENDENTE', 'CONCILIADO', 'DIVERGENCIA', 'IGNORADO');

-- CreateEnum
CREATE TYPE "StatusAprovacao" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TipoMatch" AS ENUM ('AUTOMATICO_EXATO', 'AUTOMATICO_FUZZY', 'MANUAL');

-- CreateEnum
CREATE TYPE "SessaoStatus" AS ENUM ('PROCESSANDO', 'CONCLUIDA', 'PARCIAL');

-- CreateEnum
CREATE TYPE "NaturezaLancamento" AS ENUM ('BAIXA_CLIENTE', 'BAIXA_FORNECEDOR', 'NF_SAIDA', 'NF_ENTRADA', 'CONTRAPARTIDA_BAIXA_FORNECEDOR', 'CONTRAPARTIDA_NF_SAIDA', 'OUTRO');

-- CreateTable
CREATE TABLE "ImportacaoRazao" (
    "id" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "cnpjEmpresa" TEXT NOT NULL,
    "periodo" JSONB NOT NULL,
    "status" "ImportacaoStatus" NOT NULL DEFAULT 'PROCESSANDO',
    "totalLinhas" INTEGER NOT NULL DEFAULT 0,
    "linhasImportadas" INTEGER NOT NULL DEFAULT 0,
    "erros" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportacaoRazao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaContabil" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "saldoAnterior" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ContaContabil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lancamento" (
    "id" TEXT NOT NULL,
    "importacaoId" TEXT NOT NULL,
    "contaContabilId" TEXT NOT NULL,
    "dataLancamento" TIMESTAMP(3) NOT NULL,
    "documento" TEXT NOT NULL,
    "historicoPadrao" TEXT NOT NULL,
    "complemento" TEXT,
    "contaIntegracao" TEXT,
    "centroCusto" TEXT,
    "descCentroCusto" TEXT,
    "ficha" TEXT,
    "sequencia" INTEGER,
    "debito" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credito" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(18,2) NOT NULL,
    "natureza" "NaturezaLancamento" NOT NULL,
    "dupCr" TEXT,
    "parcela" TEXT,
    "vencimento" TIMESTAMP(3),
    "cnpjParceiro" TEXT,
    "nomeParceiro" TEXT,
    "idDupCr" TEXT,
    "ordemFaturamento" TEXT,
    "doctoBaixa" TEXT,
    "bancoBaixa" TEXT,
    "ccBaixa" TEXT,
    "idBaixa" TEXT,
    "nrAdiantamento" TEXT,
    "statusConciliacao" "StatusConciliacao" NOT NULL DEFAULT 'PENDENTE',
    "parConciliadoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParConciliacao" (
    "id" TEXT NOT NULL,
    "sessaoId" TEXT NOT NULL,
    "tipoMatch" "TipoMatch" NOT NULL,
    "scoreConfianca" DOUBLE PRECISION NOT NULL,
    "diferencaValor" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "statusAprovacao" "StatusAprovacao" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "aprovadoPor" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParConciliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoConciliacao" (
    "id" TEXT NOT NULL,
    "importacaoId" TEXT NOT NULL,
    "status" "SessaoStatus" NOT NULL DEFAULT 'PROCESSANDO',
    "totalPares" INTEGER NOT NULL DEFAULT 0,
    "paresAutomatic" INTEGER NOT NULL DEFAULT 0,
    "paresManuais" INTEGER NOT NULL DEFAULT 0,
    "divergencias" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoConciliacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContaContabil_codigo_key" ON "ContaContabil"("codigo");

-- CreateIndex
CREATE INDEX "Lancamento_importacaoId_idx" ON "Lancamento"("importacaoId");

-- CreateIndex
CREATE INDEX "Lancamento_contaContabilId_idx" ON "Lancamento"("contaContabilId");

-- CreateIndex
CREATE INDEX "Lancamento_dupCr_idx" ON "Lancamento"("dupCr");

-- CreateIndex
CREATE INDEX "Lancamento_idBaixa_idx" ON "Lancamento"("idBaixa");

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_parConciliadoId_fkey" FOREIGN KEY ("parConciliadoId") REFERENCES "ParConciliacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_importacaoId_fkey" FOREIGN KEY ("importacaoId") REFERENCES "ImportacaoRazao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_contaContabilId_fkey" FOREIGN KEY ("contaContabilId") REFERENCES "ContaContabil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParConciliacao" ADD CONSTRAINT "ParConciliacao_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "SessaoConciliacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessaoConciliacao" ADD CONSTRAINT "SessaoConciliacao_importacaoId_fkey" FOREIGN KEY ("importacaoId") REFERENCES "ImportacaoRazao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
