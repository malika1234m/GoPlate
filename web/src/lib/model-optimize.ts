import { NodeIO, type Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  draco,
  flatten,
  join,
  prune,
  resample,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import draco3d from "draco3dgltf";
import sharp from "sharp";

/**
 * Shrinks a generated 3D model before it reaches our storage.
 *
 * Meshy returns roughly 40 MB per dish: a ~600k-vertex mesh with four 2048px
 * JPEG textures. Served raw that is a menu that never finishes loading on phone
 * data, and gigabytes on the uploads volume for a restaurant on an unlimited
 * plan. This pass reliably lands around 2–3 MB with no visible difference at
 * the sizes a menu renders.
 */

/**
 * Draco, deliberately, NOT meshopt. model-viewer (the customer menu and the
 * landing page both use 3.5.0) ships no meshopt decoder and fails a compressed
 * file with "setMeshoptDecoder must be called before loading compressed files",
 * rendering an empty frame. Draco decodes out of the box.
 */
const TEXTURE_SIZE: [number, number] = [2048, 2048];

/** Vertex-welding tolerance for simplification; below this, detail is visibly lost. */
const SIMPLIFY_ERROR = 0.0002;

// The wasm modules are a few MB and slow to build, so they are created once per
// process and shared. Kept lazy: a server that never generates a model, because
// MESHY_API_KEY is unset, never pays for them.
let ioPromise: Promise<NodeIO> | null = null;

function getIO(): Promise<NodeIO> {
  ioPromise ??= (async () => {
    const [decoder, encoder] = await Promise.all([
      draco3d.createDecoderModule(),
      draco3d.createEncoderModule(),
    ]);
    return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
      "draco3d.decoder": decoder,
      "draco3d.encoder": encoder,
    });
  })();
  return ioPromise;
}

async function transform(document: Document): Promise<void> {
  await document.transform(
    dedup(),
    flatten(),
    join(),
    // simplify() requires welded geometry; without this it silently no-ops.
    weld(),
    simplify({ simplifier: MeshoptSimplifier, error: SIMPLIFY_ERROR }),
    resample(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: TEXTURE_SIZE }),
    draco()
  );
}

/**
 * Returns the optimized GLB, or the input unchanged if optimization fails.
 *
 * Never throws: a model we cannot shrink is still a model the owner filmed and
 * paid a generation slot for. Losing it to a compression bug would be far worse
 * than serving it large, and the next regeneration gets another attempt.
 */
export async function optimizeGlb(input: Uint8Array): Promise<Uint8Array> {
  try {
    const io = await getIO();
    const document = await io.readBinary(input);
    await transform(document);
    const output = await io.writeBinary(document);

    // A "compressed" file that grew is a broken pass, not a saving. Ship the
    // original rather than making the menu slower than it started.
    if (output.byteLength >= input.byteLength) {
      console.warn(
        `[model-optimize] output not smaller (${input.byteLength} → ${output.byteLength} bytes); keeping original`
      );
      return input;
    }

    console.log(
      `[model-optimize] ${(input.byteLength / 1e6).toFixed(1)} MB → ${(output.byteLength / 1e6).toFixed(1)} MB`
    );
    return output;
  } catch (err) {
    console.error("[model-optimize] failed, storing the original:", err);
    return input;
  }
}
