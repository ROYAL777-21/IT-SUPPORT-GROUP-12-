import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

const root = fileURLToPath(new URL('../', import.meta.url));
try {
  for (const file of ['.env.local', '.env']) {
    try { loadEnvFile(resolve(root, file)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const configPath = resolve(root, process.env.GOOGLE_SERVICES_JSON || 'google-services.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (config.project_info?.project_id !== 'it-support-eduvos') {
    throw new Error('Use the Android configuration from the it-support-eduvos Firebase project.');
  }
  const client = config.client?.find((entry) => entry.client_info?.android_client_info?.package_name === 'za.ac.eduvos.campusithelp');
  if (!client?.client_info?.mobilesdk_app_id || !client.api_key?.some((entry) => /^AIza[\w-]+$/.test(entry.current_key))) {
    throw new Error('Download the Android configuration for package za.ac.eduvos.campusithelp.');
  }
  console.log('Android client configuration is present. Enable Microsoft with an app registration for multiple organizational directories in Firebase, then verify sign-in on a device.');
} catch (error) {
  console.error(error.code === 'ENOENT'
    ? 'Release blocked: add the real google-services.json from it-support-eduvos or set GOOGLE_SERVICES_JSON to its file path.'
    : error.message);
  process.exitCode = 1;
}
