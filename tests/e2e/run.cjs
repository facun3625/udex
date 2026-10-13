// Corre un script e2e (TypeScript) contra una base de datos DESCARTABLE.
//   DATABASE_URL=postgresql://... node tests/e2e/run.cjs tests/e2e/stock-ledger.e2e.ts
//
// NUNCA usa la base de DATABASE_URL: toma su servidor, crea (si no existe) una base "<nombre>_e2e",
// le aplica las migraciones y ejecuta ahí el script. Los scripts pueden vaciar tablas sin tocar tus datos.
// Mismo patrón que corto (tests/e2e/run.cjs de ese repo). Requiere esbuild (ya está en devDependencies).
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const esbuild = require(path.join(root, 'node_modules', 'esbuild'));
const { Client } = require(path.join(root, 'node_modules', 'pg'));
const entry = path.resolve(process.argv[2]);
const out = path.join(root, 'node_modules', '.cache', 'e2e-out.mjs');

async function prepareDatabase() {
  const url = new URL(process.env.DATABASE_URL);
  const baseName = url.pathname.replace(/^\//, '').replace(/_e2e$/, '');
  const e2eName = `${baseName}_e2e`;
  const admin = new URL(url);
  admin.pathname = '/postgres';
  admin.search = '';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [e2eName]);
  if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${e2eName}"`);
  await client.end();
  const e2eUrl = new URL(url);
  e2eUrl.pathname = `/${e2eName}`;
  const env = { ...process.env, DATABASE_URL: e2eUrl.toString() };
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'pipe', cwd: root, env });
  console.log(`(base de pruebas: ${e2eName})`);
  return env;
}

(async () => {
  const env = await prepareDatabase();
  await esbuild.build({
    entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, packages: 'external',
    tsconfig: path.join(root, 'tsconfig.json'), absWorkingDir: root,
    banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
    plugins: [{
      name: 'stubs',
      setup(b) {
        const stubs = {
          'next/cache': 'export const revalidatePath = () => {};',
          'next/navigation': 'export const redirect = (u) => { throw new Error("redirect: " + u); }; export const notFound = () => { throw new Error("notFound"); };',
          'server-only': '',
        };
        b.onResolve({ filter: /^(server-only|next\/cache|next\/navigation)$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({ contents: stubs[a.path], loader: 'js' }));
      },
    }],
  });
  execFileSync('node', [out], { stdio: 'inherit', cwd: root, env });
})().catch((e) => { console.error(e.stderr?.toString() || e.message || e); process.exit(1); });
