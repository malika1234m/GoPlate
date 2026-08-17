import { spawn } from "child_process";
import { rename, stat, unlink } from "fs/promises";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

/**
 * Shrinks owner-uploaded photos and videos before they occupy the uploads
 * volume — the same problem the 3D models had in model-optimize.ts.
 *
 * A phone photo arrives at 3–8 MB and a 60-second 1080p clip at 75–130 MB,
 * while a menu card never renders either at more than a fraction of that. Both
 * are stored raw today, so a single restaurant's menu can outgrow the whole
 * volume — which also holds the database.
 */

/** Wide enough for a full-bleed dish image on a desktop retina display. */
const MAX_IMAGE_EDGE = 1600;
const WEBP_QUALITY = 82;

/** Menus play video in a card, never full screen; 720p is already generous. */
const MAX_VIDEO_HEIGHT = 720;

export type OptimizedImage = { bytes: Uint8Array; ext: string };

/**
 * Re-encodes a photo to WebP and caps its long edge. Returns the new bytes and
 * the extension they must be written with — WebP in a .jpg file would be served
 * with the wrong content type.
 *
 * Falls back to the original on any failure: a dish photo we cannot shrink is
 * still the photo the owner chose.
 */
export async function optimizeImage(
  input: Uint8Array,
  originalExt: string
): Promise<OptimizedImage> {
  try {
    const bytes = await sharp(input)
      // withoutEnlargement: a small photo must not be blown up to 1600px,
      // which would cost bytes and add nothing.
      .rotate() // honour EXIF orientation before it is stripped by the re-encode
      .resize({
        width: MAX_IMAGE_EDGE,
        height: MAX_IMAGE_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    if (bytes.byteLength >= input.byteLength) {
      // Already smaller than what we would produce — usually an image that was
      // optimized before upload. Keep it and its original extension.
      return { bytes: input, ext: originalExt };
    }

    console.log(
      `[media-optimize] image ${(input.byteLength / 1e6).toFixed(2)} MB → ${(bytes.byteLength / 1e6).toFixed(2)} MB`
    );
    return { bytes, ext: ".webp" };
  } catch (err) {
    console.error("[media-optimize] image failed, storing the original:", err);
    return { bytes: input, ext: originalExt };
  }
}

/**
 * Codec choice follows the container, because we rewrite the file in place and
 * the extension is already baked into the URL the owner was handed. H.264 in a
 * .webm is not a legal combination and ffmpeg refuses it outright, so WebM gets
 * VP9/Opus while MP4 and MOV get H.264/AAC.
 */
function codecArgs(outputPath: string): string[] {
  if (path.extname(outputPath).toLowerCase() === ".webm") {
    return [
      "-c:v", "libvpx-vp9",
      "-crf", "34",
      "-b:v", "0",
      // VP9 is slow by default; these keep it near H.264 speed at this size.
      "-deadline", "good",
      "-cpu-used", "4",
      "-row-mt", "1",
      "-c:a", "libopus",
      "-b:a", "96k",
    ];
  }
  return [
    "-c:v", "libx264",
    // veryfast over fast: this runs on the web dyno while it also serves
    // menus, so predictable CPU matters more than a few percent of bitrate.
    "-preset", "veryfast",
    "-crf", "28",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
  ];
}

/** Transcode to 720p, preserving audio — the raw clip may be played with sound. */
function transcode(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg binary not available"));
      return;
    }
    const args = [
      "-y",
      "-i", inputPath,
      // Only ever scale down, and keep dimensions even for yuv420p.
      "-vf", `scale='min(iw,trunc(iw*${MAX_VIDEO_HEIGHT}/ih/2)*2)':'min(ih,${MAX_VIDEO_HEIGHT})'`,
      ...codecArgs(outputPath),
      outputPath,
    ];
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with ${code}: ${stderr.slice(-400)}`));
    });
  });
}

/**
 * Shrinks an already-written video in place, in the background.
 *
 * Deliberately not awaited by the upload route. Transcoding a 100 MB clip takes
 * tens of seconds; blocking on it would leave the phone waiting on a request it
 * may well time out, and the owner would lose the upload entirely. Instead the
 * original is stored and served immediately, then quietly replaced by the
 * smaller file at the same URL — so nothing in the database has to change.
 *
 * The swap is a rename within the uploads directory, which is atomic on one
 * filesystem: a diner mid-download always gets a complete file, never a
 * half-written one. If the process restarts first, the original simply stays.
 */
export function optimizeVideoInPlace(filePath: string): void {
  const tmpPath = path.join(
    path.dirname(filePath),
    `.tmp-${path.basename(filePath)}`
  );

  void (async () => {
    try {
      const before = (await stat(filePath)).size;
      await transcode(filePath, tmpPath);
      const after = (await stat(tmpPath)).size;

      if (after >= before) {
        // Re-encoding made it bigger, which happens with clips already
        // compressed hard by the phone. Keep what the owner sent.
        await unlink(tmpPath).catch(() => {});
        return;
      }

      await rename(tmpPath, filePath);
      console.log(
        `[media-optimize] video ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB (${path.basename(filePath)})`
      );
    } catch (err) {
      console.error("[media-optimize] video failed, keeping the original:", err);
      await unlink(tmpPath).catch(() => {});
    }
  })();
}
