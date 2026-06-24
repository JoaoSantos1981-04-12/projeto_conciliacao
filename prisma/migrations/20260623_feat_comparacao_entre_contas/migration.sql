-- CreateEnum
CREATE TYPE "CenarioComparacao" AS ENUM ('FORNECEDORES_BANCO', 'CLIENTES_BANCO', 'INTERCOMPANY', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "StatusParComparacao" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'IGNORADO');

-- CreateTable
CREATE TABLE "SessaoComparacao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "nomeDescritivo" TEXT NOT NULL,
    "cenario" "CenarioComparacao" NOT NULL,
    "contaOrigemId" TEXT NOT NULL,
    "contaDestinoId" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFim" TIMESTAMP(3) NOT NULL,
    "status" "SessaoStatus" NOT NULL DEFAULT 'PROCESSANDO',
    "totalParesA" INTEGER NOT NULL DEFAULT 0,
    "totalParesB" INTEGER NOT NULL DEFAULT 0,
    "paresEncontrados" INTEGER NOT NULL DEFAULT 0,
    "semParA" INTEGER NOT NULL DEFAULT 0,
    "semParB" INTEGER NOT NULL DEFAULT 0,
    "valorDivergente" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "SessaoComparacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParComparacao" (
    "id" TEXT NOT NULL,
    "sessaoId" TEXT NOT NULL,
    "lancamentoAId" TEXT,
    "lancamentoBId" TEXT,
    "tipoMatch" "TipoMatch" NOT NULL,
    "scoreConfianca" DOUBLE PRECISION NOT NULL,
    "diferencaValor" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "diferencaDias" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusParComparacao" NOT NULL DEFAULT 'PENDENTE',
    "motivoRejeicao" TEXT,
    "aprovadoPor" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParComparacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessaoComparacao_contaOrigemId_contaDestinoId_idx" ON "SessaoComparacao"("contaOrigemId", "contaDestinoId");

-- CreateIndex
CREATE INDEX "ParComparacao_sessaoId_idx" ON "ParComparacao"("sessaoId");

-- AddForeignKey
ALTER TABLE "SessaoComparacao" ADD CONSTRAINT "SessaoComparacao_contaOrigemId_fkey" FOREIGN KEY ("contaOrigemId") REFERENCES "ContaContabil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessaoComparacao" ADD CONSTRAINT "SessaoComparacao_contaDestinoId_fkey" FOREIGN KEY ("contaDestinoId") REFERENCES "ContaContabil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParComparacao" ADD CONSTRAINT "ParComparacao_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "SessaoComparacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParComparacao" ADD CONSTRAINT "ParComparacao_lancamentoAId_fkey" FOREIGN KEY ("lancamentoAId") REFERENCES "Lancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParComparacao" ADD CONSTRAINT "ParComparacao_lancamentoBId_fkey" FOREIGN KEY ("lancamentoBId") REFERENCES "Lancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
