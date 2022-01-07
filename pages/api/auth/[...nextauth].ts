import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";
import spotifyApi, { LOGIN_URL } from "../../../lib/miniontify";

async function refreshedToken(token: JWT) {
  try {
    spotifyApi.setAccessToken(token.accessToken);
    spotifyApi.setRefreshToken(token.refreshToken);

    const { body: refreshedToken } = await spotifyApi.refreshedToken();
    console.log("Refreshed token is:", refreshedToken);

    return {
      ...token,
      accessToken: Date.now() + refreshedToken.expires_in * 1000,
      refreshToken: refreshedToken.refresh_token ?? token.refreshedToken,
    };
  } catch (error) {
    console.error(error);

    return {
      ...token,
      error: "RefreshedTokenError",
    };
  }
}

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    SpotifyProvider({
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
      authorization: LOGIN_URL,
    }),
    // ...add more providers here
  ],
  secret: process.env.JWT_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          username: account.providerAccountId,
          accessTokenExpiresAt: account.expires_at * 1000,
        };
      }

      // return the previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires) {
        console.log("access token still valid");
        return token;
      }

      // Access token has expired, refresh it
      console.log("access token expired, refreshing");
      return await refreshedToken(token);
    },
    async session({ session, token }) {
      (<any>session).user.accessToken = token.accessToken;
      (<any>session).user.refreshToken = token.refreshToken;
      (<any>session).user.username = token.username;

      return session;
    },
  },
});
