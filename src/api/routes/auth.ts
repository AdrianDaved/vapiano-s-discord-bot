import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../../shared/logger';

export const authRouter = Router();

const DISCORD_API = 'https://discord.com/api/v10';
const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const REDIRECT_URI = process.env.OAUTH2_REDIRECT_URI || 'http://localhost:3001/auth/callback';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5173';

/**
 * GET /auth/login — Redirect to Discord OAuth2
 */
authRouter.get('/login', (req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds',
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

/**
 * GET /auth/callback — Handle OAuth2 callback from Discord
 */
authRouter.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    res.redirect(`${DASHBOARD_URL}/login?error=no_code`);
    return;
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      logger.error(`OAuth2 token exchange failed: ${tokenResponse.status}`);
      res.redirect(`${DASHBOARD_URL}/login?error=token_exchange`);
      return;
    }

    const tokens: any = await tokenResponse.json();

    // Fetch user info
    const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      res.redirect(`${DASHBOARD_URL}/login?error=user_fetch`);
      return;
    }

    const user: any = await userResponse.json();

    // Create JWT
    const jwtToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        accessToken: tokens.access_token,
      },
      process.env.API_SECRET!,
      { expiresIn: '7d' }
    );

    // Store JWT in session and set httpOnly cookie
    (req.session as any).token = jwtToken;
    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    // Redirect to dashboard — frontend reads token from /auth/me (no token in URL)
    res.redirect(`${DASHBOARD_URL}/callback`);
  } catch (err) {
    logger.error(`OAuth2 callback error: ${err}`);
    res.redirect(`${DASHBOARD_URL}/login?error=unknown`);
  }
});

/**
 * GET /auth/exchange — Return the JWT once after OAuth callback (clears from session after use)
 * Called by the dashboard Callback page to retrieve the token without it being in the URL.
 */
authRouter.get('/exchange', (req: Request, res: Response) => {
  const sessionToken = (req.session as any).token;
  if (!sessionToken) {
    res.status(401).json({ error: 'No pending token' });
    return;
  }
  // One-time use — clear after retrieval
  delete (req.session as any).token;
  res.json({ token: sessionToken });
});

/**
 * GET /auth/me — Get current user info
 */
authRouter.get('/me', async (req: Request, res: Response) => {
  const token =
    req.headers.authorization?.replace('Bearer ', '') ||
    req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.API_SECRET!) as any;
    res.json({
      id: decoded.id,
      username: decoded.username,
      discriminator: decoded.discriminator,
      avatar: decoded.avatar,
      avatarUrl: decoded.avatar
        ? `https://cdn.discordapp.com/avatars/${decoded.id}/${decoded.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(decoded.discriminator || '0') % 5}.png`,
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

/**
 * POST /auth/logout — Clear auth cookie
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true });
});
