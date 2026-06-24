import { withAuth } from 'next-auth/middleware'

// Protege todas as rotas (páginas e API), exceto autenticação, login e estáticos.
export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  matcher: ['/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)'],
}
