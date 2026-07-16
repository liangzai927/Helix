import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');
const extensionOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  minify: production,
  sourcemap: !production,
  logLevel: 'info',
};
const webviewOptions = {
  entryPoints: ['webview-ui/src/main.tsx'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  outdir: 'dist',
  entryNames: 'webview',
  minify: production,
  sourcemap: !production,
  logLevel: 'info',
};

/** 构建 Extension Host 入口，watch 模式供持续开发时使用。 */
async function runBuild() {
  if (watch) {
    const contexts = await Promise.all([
      esbuild.context(extensionOptions),
      esbuild.context(webviewOptions),
    ]);
    await Promise.all(contexts.map((context) => context.watch()));
    return;
  }

  await Promise.all([
    esbuild.build(extensionOptions),
    esbuild.build(webviewOptions),
  ]);
}

await runBuild();
