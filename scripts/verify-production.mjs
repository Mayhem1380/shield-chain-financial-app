import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function verificationEnvironment(inherited = process.env) {
  // Deliberately use a non-production DB target. Schema generation does not connect.
  return { ...inherited, DATABASE_URL: 'postgresql://validation:validation@127.0.0.1:5432/shieldchain_validation', PAYMENTS_MODE: 'disabled', PAYMENTS_LIVE_ENABLED: 'false', NEXT_TELEMETRY_DISABLED: '1', SHIELDCHAIN_VERIFY_BUILD: '1' };
}
export function redactVerificationLog(text) {
  return text.replace(/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9_]+|\bwhsec_[A-Za-z0-9_]+|\bgh[pousr]_[A-Za-z0-9_]+/g, '[REDACTED]')
    .replace(/(postgres(?:ql)?:\/\/)[^\s/@]+:[^\s/@]+@/g, '$1[REDACTED]@');
}

export async function verifyProduction({ install = false, reportDirectory } = {}) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const output = reportDirectory || join(root, '.verification', new Date().toISOString().replaceAll(':', '-'));
  mkdirSync(output, { recursive: true });
  const report = { root, startedAt: new Date().toISOString(), liveChargingEnabled: false, stages: [], databaseMigration: 'NOT_APPLIED', genuinePayment: 'NOT_TESTED' };
  const env = verificationEnvironment();
  const persist = () => writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  async function stage(name, program, args, { sql = false } = {}) {
    const result = await new Promise(resolveResult => {
      const child = spawn(program, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '', stderr = '', timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, 240000);
      child.stdout.on('data', bytes => { stdout += bytes; });
      child.stderr.on('data', bytes => { stderr += bytes; });
      child.on('error', error => { stderr += error.message; });
      child.on('close', code => { clearTimeout(timer); resolveResult({ exit: code ?? 1, timedOut, stdout, stderr }); });
    });
    writeFileSync(join(output, `${name}.log`), redactVerificationLog(result.stdout + result.stderr));
    if (sql && result.exit === 0) {
      writeFileSync(join(output, 'initial-schema.sql'), result.stdout);
      report.databaseMigration = 'SQL_GENERATED_NOT_APPLIED';
    }
    report.stages.push({ name, exit: result.exit, timedOut: result.timedOut });
    persist();
    console.log(`${name}: ${result.exit === 0 ? 'passed' : 'failed'}; logs in ${output}`);
    return result.exit === 0;
  }
  persist();
  if (install) {
    const hasLock = existsSync(join(root, 'package-lock.json'));
    if (!await stage('dependencies', 'npm', [hasLock ? 'ci' : 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--fetch-retries=0', '--fetch-timeout=15000', '--cache', join(root, '.verification', 'npm-cache')])) return report;
  }
  const required = ['next/package.json', 'typescript/bin/tsc', 'prisma/build/index.js', '@prisma/client/package.json'];
  const missing = required.filter(path => !existsSync(join(root, 'node_modules', path)));
  if (missing.length || !existsSync(join(root, 'package-lock.json'))) {
    report.blocker = { code: 'DEPENDENCIES_OR_LOCKFILE_MISSING', packages: missing, lockfileMissing: !existsSync(join(root, 'package-lock.json')) };
    persist(); console.log(`Verification blocked: dependencies/lockfile missing. Report: ${output}`); return report;
  }
  const prisma = join(root, 'node_modules', 'prisma', 'build', 'index.js');
  if (!await stage('prisma-validate', process.execPath, [prisma, 'validate'])) return report;
  if (!await stage('prisma-generate', process.execPath, [prisma, 'generate'])) return report;
  if (!await stage('schema-sql', process.execPath, [prisma, 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { sql: true })) return report;
  let passed = true;
  passed = await stage('production-dependency-audit', 'npm', ['audit', '--omit=dev', '--audit-level=high', '--json', '--cache', join(root, '.verification', 'npm-cache')]);
  for (const command of ['test:policy', 'preflight', 'db:preflight', 'security:preflight', 'ci:contract', 'typecheck', 'lint', 'build']) {
    passed = await stage(command.replaceAll(':', '-'), 'npm', ['run', command]) && passed;
  }
  report.completedAt = new Date().toISOString(); report.productionChecksPassed = passed;
  persist(); return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await verifyProduction({ install: process.argv.includes('--install'), reportDirectory: process.env.SHIELDCHAIN_VERIFICATION_OUTPUT });
  if (report.blocker || report.productionChecksPassed !== true) process.exitCode = 1;
}
