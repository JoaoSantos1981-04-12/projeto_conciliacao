/**
 * Tipagem para o caminho interno do pdf-parse (correção B3 da SPEC v2.0).
 *
 * Importar de "pdf-parse/lib/pdf-parse.js" evita o ENOENT no boot da v1
 * (o index.js da raiz lê um PDF de teste em debug). O @types/pdf-parse só
 * declara o módulo raiz "pdf-parse", então aqui reexportamos os mesmos tipos
 * para o subpath — mantendo o código tipado (sem `any`).
 */
declare module 'pdf-parse/lib/pdf-parse.js' {
  import pdfParse from 'pdf-parse'
  export default pdfParse
}
