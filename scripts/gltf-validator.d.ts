declare module 'gltf-validator' {
  interface ValidationOptions {
    uri?: string;
    maxIssues?: number;
  }

  interface GltfValidator {
    validateBytes(bytes: Uint8Array, options?: ValidationOptions): Promise<unknown>;
  }

  const validator: GltfValidator;
  export default validator;
}
