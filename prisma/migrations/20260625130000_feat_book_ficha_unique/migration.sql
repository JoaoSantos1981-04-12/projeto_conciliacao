-- Unicidade de ficha por (book, conta) — evita ficha duplicada e habilita upsert idempotente.
-- CreateIndex
CREATE UNIQUE INDEX "FichaConciliacao_bookId_codigoConta_key" ON "FichaConciliacao"("bookId", "codigoConta");
