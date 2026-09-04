import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@yt/database';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.username,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email!;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        const email = user.email!;
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (!existingUser) {
          const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const data: any = {
            email,
            username: `${username}_${Math.random().toString(36).substring(2, 6)}`,
            displayName: user.name || username,
            avatarUrl: user.image,
            emailVerified: new Date(),
          };

          if (account.provider === 'google') data.googleId = account.providerAccountId;
          if (account.provider === 'github') data.githubId = account.providerAccountId;

          const handle = `@${username}_${Math.random().toString(36).substring(2, 4)}`;

          await prisma.user.create({
            data: {
              ...data,
              channel: {
                create: {
                  handle,
                  name: user.name || username,
                  avatarUrl: user.image,
                },
              },
            },
          });
        } else {
          const updateData: any = {};
          if (!existingUser.googleId && account.provider === 'google') updateData.googleId = account.providerAccountId;
          if (!existingUser.githubId && account.provider === 'github') updateData.githubId = account.providerAccountId;
          if (user.image && !existingUser.avatarUrl) updateData.avatarUrl = user.image;

          if (Object.keys(updateData).length > 0) {
            await prisma.user.update({ where: { id: existingUser.id }, data: updateData });
          }
        }
        return true;
      }
      return true;
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
});
