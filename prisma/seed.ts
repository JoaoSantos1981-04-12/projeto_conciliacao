import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Valores padrão servem ao desenvolvimento local. Em produção, defina
// ADMIN_EMAIL / ADMIN_PASSWORD (e opcionalmente ADMIN_NAME) no ambiente.
const DEFAULT_EMAIL = 'admin@ncc.com.br'
const DEFAULT_PASSWORD = 'conciliacao123'
const DEFAULT_NAME = 'Administrador'

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim() || DEFAULT_EMAIL
  const senha = process.env.ADMIN_PASSWORD?.trim() || DEFAULT_PASSWORD
  const name = process.env.ADMIN_NAME?.trim() || DEFAULT_NAME

  const usandoSenhaPadrao = !process.env.ADMIN_PASSWORD?.trim()
  if (usandoSenhaPadrao && process.env.NODE_ENV === 'production') {
    throw new Error(
      'ADMIN_PASSWORD não definido em produção. Defina ADMIN_EMAIL e ADMIN_PASSWORD antes de rodar o seed.',
    )
  }

  const passwordHash = await bcrypt.hash(senha, 10)

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, name, passwordHash },
  })

  console.log('Usuário inicial pronto:')
  console.log('  e-mail:', email)
  // Só exibe a senha quando é o padrão de desenvolvimento; senha vinda do
  // ambiente é mascarada para não vazar em logs.
  console.log('  senha :', usandoSenhaPadrao ? senha : '******** (via ADMIN_PASSWORD)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
