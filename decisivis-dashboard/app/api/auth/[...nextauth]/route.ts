import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'

// In production, store this hashed password in database
// This is a hash of "Decisivis2025!" - change this!
const ADMIN_PASSWORD_HASH = '$2a$10$K7L1OmqQj0V6FGZvKp5X7.kMWVqGCc6R5N4dHGkm8RBQr.y5wt8oi'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // In production, check against database
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        // For now, simple admin check
        if (credentials.username !== 'admin') {
          return null
        }

        // Verify password (in production, get hash from database)
        const isValid = await compare(credentials.password, ADMIN_PASSWORD_HASH)
        
        if (!isValid) {
          return null
        }

        return {
          id: '1',
          name: 'Admin',
          email: 'admin@decisivis.com'
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this-in-production',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }