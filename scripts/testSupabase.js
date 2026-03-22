/* eslint-env node */
/* global process */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const ENV_FILES = ['.env.local', '.env'];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadEnvironment() {
  for (const file of ENV_FILES) {
    loadEnvFile(path.join(process.cwd(), file));
  }
}

async function verifyTable(client, tableName) {
  const startedAt = Date.now();
  const { error, count } = await client
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  const durationMs = Date.now() - startedAt;

  if (error) {
    throw new Error(`${tableName}: ${error.message}`);
  }

  return { tableName, count, durationMs };
}

async function main() {
  loadEnvironment();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log(`🔌 Testing Supabase connectivity against ${new URL(supabaseUrl).host}`);

  const checks = await Promise.all([
    verifyTable(client, 'profiles'),
    verifyTable(client, 'student_subjects'),
  ]);

  for (const check of checks) {
    console.log(
      `✅ ${check.tableName} reachable (${check.durationMs} ms, count=${check.count ?? 0})`
    );
  }
}

main().catch((error) => {
  console.error(`❌ Supabase connectivity test failed: ${error.message}`);
  process.exit(1);
});
