/**
 * Welcome Image Generator
 * Creates a Discord-style welcome card with:
 * - Dark background
 * - Circular avatar with white ring
 * - "BIENVENID@" text in bold
 * - Username below
 */
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { GuildMember } from 'discord.js';
import logger from '../../../shared/logger';

// Image dimensions (wide banner like the screenshot)
const WIDTH = 900;
const HEIGHT = 400;

/**
 * Generate a welcome image buffer for a new member
 */
export async function generateWelcomeImage(member: GuildMember): Promise<Buffer> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // ─── Background (solid dark) ───────────────────────
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ─── Subtle radial glow behind avatar ──────────────
  const gradient = ctx.createRadialGradient(WIDTH / 2, 150, 40, WIDTH / 2, 150, 250);
  gradient.addColorStop(0, 'rgba(88, 101, 242, 0.15)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ─── Load and draw circular avatar ─────────────────
  const avatarSize = 140;
  const avatarX = WIDTH / 2;
  const avatarY = 145;
  const ringWidth = 4;

  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatarImg = await loadImage(avatarURL);

    // White ring
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2 + ringWidth, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.closePath();

    // Clip circle for avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();
  } catch (err) {
    logger.error(`[WelcomeImage] Failed to load avatar: ${err}`);
    // Draw placeholder circle
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#36393f';
    ctx.fill();
    ctx.closePath();
  }

  // ─── "BIENVENID@" text ─────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Main title — bold, large
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Arial Black", "Impact", sans-serif';
  ctx.fillText('BIENVENID@', WIDTH / 2, 240);

  // ─── Username text ─────────────────────────────────
  const username = member.user.username.toUpperCase();
  ctx.fillStyle = '#b9bbbe';
  ctx.font = 'bold 28px "Arial", "Helvetica", sans-serif';
  ctx.fillText(username, WIDTH / 2, 298);

  // ─── Return PNG buffer ─────────────────────────────
  return canvas.toBuffer('image/png') as unknown as Buffer;
}

/**
 * Generate welcome image with custom server icon overlay (optional)
 * For servers that have a custom icon, it gets layered behind the avatar
 */
export async function generateWelcomeImageWithIcon(
  member: GuildMember,
  serverIconURL?: string | null
): Promise<Buffer> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // ─── Background ────────────────────────────────────
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle gradient glow
  const gradient = ctx.createRadialGradient(WIDTH / 2, 145, 50, WIDTH / 2, 145, 280);
  gradient.addColorStop(0, 'rgba(88, 101, 242, 0.12)');
  gradient.addColorStop(0.5, 'rgba(130, 80, 230, 0.06)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ─── Avatar ────────────────────────────────────────
  const avatarSize = 140;
  const avatarX = WIDTH / 2;
  const avatarY = 140;
  const ringWidth = 4;

  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatarImg = await loadImage(avatarURL);

    // White ring
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2 + ringWidth, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.closePath();

    // Clip + draw avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();
  } catch (err) {
    logger.error(`[WelcomeImage] Failed to load avatar: ${err}`);
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#36393f';
    ctx.fill();
    ctx.closePath();
  }

  // ─── "BIENVENID@" ─────────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Arial Black", "Impact", sans-serif';
  ctx.fillText('BIENVENID@', WIDTH / 2, 235);

  // ─── Username ──────────────────────────────────────
  const username = member.user.username.toUpperCase();
  ctx.fillStyle = '#b9bbbe';
  ctx.font = 'bold 28px "Arial", "Helvetica", sans-serif';
  ctx.fillText(username, WIDTH / 2, 293);

  return canvas.toBuffer('image/png') as unknown as Buffer;
}
