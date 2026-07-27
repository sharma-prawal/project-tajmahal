import { execFileSync } from 'node:child_process';

/**
 * Graceful capability detection for the small fixed CLI toolchain
 * (docs/phase-2/10-asset-pipeline-contract.md). Content-lint must not
 * hard-fail on a dev machine missing an external binary — it skips the
 * specific checks that binary would have enabled and prints setup
 * instructions instead.
 */
export interface ToolAvailability {
  name: string;
  available: boolean;
  setupInstructions: string;
}

function checkBinary(name: string, versionArgs: string[]): boolean {
  try {
    execFileSync(name, versionArgs, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function detectCapabilities(): ToolAvailability[] {
  return [
    {
      name: 'ffmpeg',
      available: checkBinary('ffmpeg', ['-version']),
      setupInstructions: 'Install via `brew install ffmpeg` (macOS) for audio conversion/loudness checks.',
    },
    {
      name: 'gltf-validator',
      available: checkBinary('gltf-validator', ['--version']) || checkBinary('npx', ['--no-install', 'gltf-validator', '--version']),
      setupInstructions: 'Install via `pnpm add -D gltf-validator` for full GLB conformance checking.',
    },
    {
      name: 'toktx',
      available: checkBinary('toktx', ['--version']),
      setupInstructions: 'Install the KTX-Software CLI tools (https://github.com/KhronosGroup/KTX-Software/releases) for KTX2/Basis compression checks.',
    },
    {
      name: 'sharp',
      available: (() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require.resolve('sharp');
          return true;
        } catch {
          return false;
        }
      })(),
      setupInstructions: 'Install via `pnpm add -D sharp` for texture downscale/format-conversion checks.',
    },
  ];
}

export function printCapabilityReport(tools: ToolAvailability[]): void {
  console.log('\n--- Content pipeline tool capability report ---');
  for (const tool of tools) {
    if (tool.available) {
      console.log(`  [ok]      ${tool.name}`);
    } else {
      console.log(`  [missing] ${tool.name} — checks requiring it are skipped, not failed.`);
      console.log(`             ${tool.setupInstructions}`);
    }
  }
  console.log('------------------------------------------------\n');
}
