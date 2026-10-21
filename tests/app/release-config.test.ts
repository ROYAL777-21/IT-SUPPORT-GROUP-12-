import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../scripts/check-release.mjs', import.meta.url));
const directories: string[] = [];

// These files exist only in temporary test directories and never configure a build.
function clientConfig() {
  return {
    project_info: { project_id: 'it-support-eduvos' },
    client: [{
      client_info: {
        mobilesdk_app_id: 'test-only-android-app',
        android_client_info: { package_name: 'za.ac.eduvos.campusithelp' },
      },
      api_key: [{ current_key: 'AIza-test-only-public-config' }],
    }],
  };
}

function runCheck(config?: ReturnType<typeof clientConfig>) {
  const directory = mkdtempSync(join(tmpdir(), 'it-support-release-test-'));
  directories.push(directory);
  const path = join(directory, 'google-services.json');
  if (config) writeFileSync(path, JSON.stringify(config));
  const env: NodeJS.ProcessEnv = { ...process.env, GOOGLE_SERVICES_JSON: path };
  delete env.EXPO_PUBLIC_AZURE_TENANT_ID;
  return spawnSync(process.execPath, [script], { env, encoding: 'utf8', timeout: 10000 });
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('Android release configuration', () => {
  it('accepts the Android client configuration without an Eduvos tenant ID', () => {
    const result = runCheck(clientConfig());
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('verify sign-in on a device');
  });
  it('still blocks a build when the Android configuration is absent', () => {
    const result = runCheck();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('add the real google-services.json');
  });
  it('rejects configuration from another Firebase project', () => {
    const config = clientConfig();
    config.project_info.project_id = 'different-project';
    const result = runCheck(config);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('it-support-eduvos');
  });
  it('rejects configuration for another Android package', () => {
    const config = clientConfig();
    config.client[0].client_info.android_client_info.package_name = 'other.app';
    const result = runCheck(config);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('za.ac.eduvos.campusithelp');
  });
  it('rejects an incomplete Android client', () => {
    const config = clientConfig();
    config.client[0].api_key = [];
    expect(runCheck(config).status).toBe(1);
  });
});
