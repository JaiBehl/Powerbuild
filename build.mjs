import { copyFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const outputDir = 'dist';
const files = [
  'index.html',
  'styles.css',
  'app-core.js',
  'app-views.js',
  'app-settings.js'
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

await Promise.all(
  files.map((file) => copyFile(file, join(outputDir, file)))
);

console.log(`Built Powerbuild to ${outputDir}/`);
