/**
 * draco3dgltf ships no type declarations. Only the two factory functions
 * @gltf-transform/core needs are declared; their results are opaque wasm
 * modules that get handed straight to registerDependencies().
 */
declare module "draco3dgltf" {
  const draco3d: {
    createDecoderModule(): Promise<unknown>;
    createEncoderModule(): Promise<unknown>;
  };
  export default draco3d;
}
