-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('RASCUNHO', 'EM_REVISAO', 'APROVADO', 'FECHADO');

-- CreateEnum
CREATE TYPE "StatusFicha" AS ENUM ('PENDENTE', 'CONCILIADA', 'TOLERANCIA', 'DIVERGENTE');

-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('ATIVO_CIRCULANTE', 'ATIVO_BANCO', 'PASSIVO_CIRCULANTE', 'RESULTADO', 'OUTROS');

-- CreateEnum
CREATE TYPE "TipoRelatorio" AS ENUM ('BALANCETE', 'CR_ABERTO', 'CP_ABERTO', 'EXTRATO_BANCARIO', 'OUTROS');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('AGUARDANDO', 'PROCESSANDO', 'CONCLUIDO', 'ERRO');

-- CreateEnum
CREATE TYPE "StatusCheckList" AS ENUM ('PENDENTE', 'CONCLUIDO', 'NAO_APLICAVEL');

-- CreateEnum
CREATE TYPE "StatusOcorrencia" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'RESOLVIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoItemRelatorio" AS ENUM ('TITULO_ABERTO', 'ITEM_TRANSITO');

-- CreateTable
CREATE TABLE "BookDigital" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "elaboradoPor" TEXT NOT NULL,
    "status" "BookStatus" NOT NULL DEFAULT 'RASCUNHO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookDigital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FichaConciliacao" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "tipoConta" "TipoConta" NOT NULL,
    "codigoConta" TEXT NOT NULL,
    "nomeConta" TEXT NOT NULL,
    "saldoRazao" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldoBalancete" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldoRelatorio" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tieRazaoBalancete" BOOLEAN NOT NULL DEFAULT false,
    "tieRazaoRelatorio" BOOLEAN NOT NULL DEFAULT false,
    "statusConciliacao" "StatusFicha" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "analiseLlm" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FichaConciliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfSuporte" (
    "id" TEXT NOT NULL,
    "fichaId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "tipoRelatorio" "TipoRelatorio" NOT NULL,
    "hash" TEXT NOT NULL,
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'AGUARDANDO',
    "parseConfiavel" BOOLEAN NOT NULL DEFAULT true,
    "deltaIntegridade" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldoAnterior" DECIMAL(18,2),
    "saldoFinal" DECIMAL(18,2),
    "totalDebitos" DECIMAL(18,2),
    "totalCreditos" DECIMAL(18,2),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdfSuporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemRelatorio" (
    "id" TEXT NOT NULL,
    "fichaId" TEXT NOT NULL,
    "pdfSuporteId" TEXT NOT NULL,
    "tipo" "TipoItemRelatorio" NOT NULL,
    "documento" TEXT,
    "dupCr" TEXT,
    "dupCp" TEXT,
    "cnpj" TEXT,
    "nome" TEXT,
    "dataEmissao" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3),
    "diasAtraso" INTEGER,
    "valorAberto" DECIMAL(18,2),
    "debito" DECIMAL(18,2),
    "credito" DECIMAL(18,2),
    "saldo" DECIMAL(18,2),
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemRelatorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckListItem" (
    "id" TEXT NOT NULL,
    "fichaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusCheckList" NOT NULL DEFAULT 'PENDENTE',
    "responsavel" TEXT,
    "prazo" TIMESTAMP(3),
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcorrenciaBook" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "fichaId" TEXT,
    "descricao" TEXT NOT NULL,
    "status" "StatusOcorrencia" NOT NULL DEFAULT 'ABERTA',
    "responsavel" TEXT,
    "acaoCorretiva" TEXT,
    "prazo" TIMESTAMP(3),
    "nettingFlag" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcorrenciaBook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookDigital_empresaId_ano_mes_idx" ON "BookDigital"("empresaId", "ano", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "BookDigital_empresaId_ano_mes_key" ON "BookDigital"("empresaId", "ano", "mes");

-- CreateIndex
CREATE INDEX "FichaConciliacao_bookId_idx" ON "FichaConciliacao"("bookId");

-- CreateIndex
CREATE INDEX "PdfSuporte_fichaId_idx" ON "PdfSuporte"("fichaId");

-- CreateIndex
CREATE UNIQUE INDEX "PdfSuporte_fichaId_hash_key" ON "PdfSuporte"("fichaId", "hash");

-- CreateIndex
CREATE INDEX "ItemRelatorio_fichaId_idx" ON "ItemRelatorio"("fichaId");

-- CreateIndex
CREATE INDEX "ItemRelatorio_pdfSuporteId_idx" ON "ItemRelatorio"("pdfSuporteId");

-- CreateIndex
CREATE INDEX "ItemRelatorio_dupCr_idx" ON "ItemRelatorio"("dupCr");

-- CreateIndex
CREATE INDEX "ItemRelatorio_dupCp_idx" ON "ItemRelatorio"("dupCp");

-- CreateIndex
CREATE INDEX "CheckListItem_fichaId_idx" ON "CheckListItem"("fichaId");

-- CreateIndex
CREATE INDEX "OcorrenciaBook_bookId_idx" ON "OcorrenciaBook"("bookId");

-- CreateIndex
CREATE INDEX "OcorrenciaBook_fichaId_idx" ON "OcorrenciaBook"("fichaId");

-- AddForeignKey
ALTER TABLE "FichaConciliacao" ADD CONSTRAINT "FichaConciliacao_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "BookDigital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfSuporte" ADD CONSTRAINT "PdfSuporte_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "FichaConciliacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemRelatorio" ADD CONSTRAINT "ItemRelatorio_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "FichaConciliacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemRelatorio" ADD CONSTRAINT "ItemRelatorio_pdfSuporteId_fkey" FOREIGN KEY ("pdfSuporteId") REFERENCES "PdfSuporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckListItem" ADD CONSTRAINT "CheckListItem_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "FichaConciliacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcorrenciaBook" ADD CONSTRAINT "OcorrenciaBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "BookDigital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcorrenciaBook" ADD CONSTRAINT "OcorrenciaBook_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "FichaConciliacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
