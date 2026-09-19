"use client";

// ─────────────────────────────────────────────────────────────
// share-card — renders the session summary as a branded
// 1080×1350 PNG on a canvas (cream paper, brick-red accents,
// dotted texture) and triggers a download. Colors mirror the
// accuracy-ring semantics: success ≥ 80% · primary 50–79% ·
// destructive < 50%.
// ─────────────────────────────────────────────────────────────

export interface ShareCardData {
  score: number;
  total: number;
  /** 0..1 */
  accuracy: number;
  bestStreak: number;
  avgMsPerQuestion: number;
  /** e.g. "timed · 2 min" */
  modeLine: string;
}

const W = 1080;
const H = 1350;

// palette (light paper theme — theme-independent for sharing)
const PAPER = "#f7f0e1";
const INK = "#2b2118";
const INK_MUTED = "rgba(43, 33, 24, 0.55)";
const INK_FAINT = "rgba(43, 33, 24, 0.28)";
const BRICK = "#b03d2c";
const GREEN = "#5c8a4e";
const RED = "#a63d33";

function accuracyColor(accuracy: number): string {
  if (accuracy >= 0.8) return GREEN;
  if (accuracy >= 0.5) return BRICK;
  return RED;
}

/** resolve the app's next/font families for canvas use */
async function resolveFonts() {
  const cs = getComputedStyle(document.documentElement);
  const display = cs.getPropertyValue("--font-fraunces").trim() || "Georgia, serif";
  const mono = cs.getPropertyValue("--font-plex-mono").trim() || "monospace";
  const body = cs.getPropertyValue("--font-inter").trim() || "sans-serif";
  try {
    await Promise.all([
      document.fonts.load(`700 italic 220px ${display}`),
      document.fonts.load(`600 italic 64px ${display}`),
      document.fonts.load(`500 26px ${mono}`),
      document.fonts.load(`400 26px ${body}`),
    ]);
    await document.fonts.ready;
  } catch {
    // best effort — fall back to system families
  }
  return { display, mono, body };
}

/** letterspaced mono label — canvas has no letter-spacing, so draw per char */
function monoSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number,
  color: string,
  size = 26
) {
  ctx.save();
  ctx.font = `500 ${size}px ${MONO}`;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total =
    widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.restore();
}

let MONO = "monospace"; // set once fonts resolve

function drawCard(
  ctx: CanvasRenderingContext2D,
  d: ShareCardData,
  fonts: { display: string; mono: string; body: string },
  dateLabel: string
) {
  MONO = fonts.mono;
  const acc = Math.min(1, Math.max(0, d.accuracy));
  const pct = Math.round(acc * 100);

  // ── paper + dotted texture ──────────────────────────────
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(139, 116, 84, 0.16)";
  for (let y = 36; y < H; y += 36) {
    for (let x = 36 + ((y / 36) % 2) * 18; x < W; x += 36) {
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── editorial frame ─────────────────────────────────────
  ctx.strokeStyle = INK_FAINT;
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  // corner ticks in brick
  ctx.strokeStyle = BRICK;
  ctx.lineWidth = 5;
  const tick = 26;
  const corners: [number, number, number, number][] = [
    [44, 44, 1, 1],
    [W - 44, 44, -1, 1],
    [44, H - 44, 1, -1],
    [W - 44, H - 44, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + sx * tick, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * tick);
    ctx.stroke();
  }

  ctx.textAlign = "center";

  // ── masthead ────────────────────────────────────────────
  monoSpaced(ctx, "TABLA DE VERBOS", W / 2, 132, 10, INK, 28);
  monoSpaced(ctx, "SPANISH VERB MASTERY", W / 2, 172, 6, INK_MUTED, 18);

  // ── headline ────────────────────────────────────────────
  ctx.fillStyle = INK;
  ctx.font = `600 italic 72px ${fonts.display}`;
  ctx.textBaseline = "middle";
  ctx.fillText("sesión de práctica", W / 2, 292);

  // ── giant accuracy ──────────────────────────────────────
  const accColor = accuracyColor(acc);
  ctx.fillStyle = accColor;
  ctx.font = `700 italic 300px ${fonts.display}`;
  ctx.fillText(`${pct}`, W / 2 - 34, 570);
  ctx.font = `700 italic 150px ${fonts.display}`;
  ctx.fillText("%", W / 2 + 236, 640);
  monoSpaced(ctx, "PRECISIÓN", W / 2, 780, 9, INK_MUTED, 24);

  // ── score ───────────────────────────────────────────────
  ctx.fillStyle = INK;
  ctx.font = `600 italic 88px ${fonts.display}`;
  ctx.fillText(
    `${d.score} / ${d.total}`,
    W / 2,
    900
  );
  monoSpaced(ctx, "RESPUESTAS CORRECTAS", W / 2, 972, 7, INK_MUTED, 20);

  // ── divider ─────────────────────────────────────────────
  ctx.strokeStyle = BRICK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 40, 1032);
  ctx.lineTo(W / 2 + 40, 1032);
  ctx.stroke();

  // ── stats row ───────────────────────────────────────────
  const stats: [string, string][] = [
    ["RACHA MÁXIMA", String(d.bestStreak)],
    ["TIEMPO / PREGUNTA", `${(d.avgMsPerQuestion / 1000).toFixed(1)}s`],
    ["MODO", d.modeLine],
  ];
  const colW = 300;
  stats.forEach(([label, value], i) => {
    const x = W / 2 + (i - 1) * colW;
    monoSpaced(ctx, label, x, 1092, 4, INK_MUTED, 17);
    ctx.fillStyle = INK;
    ctx.font = `500 30px ${fonts.mono}`;
    ctx.fillText(value, x, 1140);
  });

  // ── footer ──────────────────────────────────────────────
  monoSpaced(ctx, dateLabel.toUpperCase(), W / 2, 1240, 5, INK_MUTED, 20);
  monoSpaced(ctx, "— TABLADEVERBOS —", W / 2, 1276, 5, INK_FAINT, 16);
}

/** render the card and trigger a PNG download; resolves false on failure */
export async function downloadShareCard(d: ShareCardData): Promise<boolean> {
  try {
    const fonts = await resolveFonts();
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const dateLabel = new Date().toLocaleDateString("es", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    drawCard(ctx, d, fonts, dateLabel);

    return await new Promise<boolean>((resolve) => {
      try {
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `tabla-de-verbos-${d.score}de${d.total}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 4000);
          resolve(true);
        }, "image/png");
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}
