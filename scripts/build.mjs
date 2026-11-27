import { appendFile, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const marker = '<!-- react-phone-entry -->';
const index = await readFile(path.join(root, 'index.html'), 'utf8');
if (index.split(marker).length !== 2) {
  throw new Error('Expected one react-phone-entry marker in index.html');
}

const loadPhone = `<script type="module">
  const query = new URLSearchParams(location.search);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches &&
      query.get('visual') !== 'estatico' && query.get('renderer') !== 'webgl') {
    import('/react-phone-build.js').catch(error => {
      console.warn('MOVVA handset unavailable', error);
    });
  }
</script>`;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Ship the existing public routes and assets alongside the client bundle.
const directories = new Set(['assets', 'privacy', 'support', 'terms']);
const entries = await readdir(root, { withFileTypes: true });
for (const entry of entries) {
  if (directories.has(entry.name) || (entry.isFile() && /\.(css|js|xml|txt)$/.test(entry.name))) {
    await cp(path.join(root, entry.name), path.join(output, entry.name), {
      recursive: true,
      filter: source => source !== path.join(root, 'assets', 'telas')
    });
  }
}
const bundle = await build({
  absWorkingDir: root,
  entryPoints: ['react-phone.jsx'],
  outfile: path.join(output, 'react-phone-build.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022', 'safari16'],
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  minify: true,
  legalComments: 'linked',
  metafile: true,
  logLevel: 'info'
});
// Some dependencies ship their notices separately from the imported modules.
const modules = bundle.metafile.outputs['dist/react-phone-build.js'].inputs;
const packages = new Set(Object.keys(modules).map(file =>
  file.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)/)?.[0]
).filter(Boolean));
for (const dir of [...packages].sort()) {
  const files = await readdir(path.join(root, dir));
  const license = files.find(file => /^licen[cs]e(?:\.(?:md|txt))?$/i.test(file));
  const info = JSON.parse(await readFile(path.join(root, dir, 'package.json'), 'utf8'));
  const terms = license ? await readFile(path.join(root, dir, license), 'utf8') : info.license;
  if (terms) await appendFile(path.join(output, 'react-phone-build.js.LEGAL.txt'), `\n${info.name} ${info.version}\n${terms}\n`);
}
await writeFile(path.join(output, 'index.html'), index.replace(marker, loadPhone));
