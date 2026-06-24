import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@hailo.com.br'
  const senha = 'conciliacao123'
  const passwordHash = await bcrypt.hash(senha, 10)

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: 'Administrador' },
    create: { email, name: 'Administrador', passwordHash },
  })

  console.log('Usuário inicial pronto:')
  console.log('  e-mail:', email)
  console.log('  senha :', senha)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
