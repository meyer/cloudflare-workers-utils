// @ts-check

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getPackages } from '@manypkg/get-packages';

const { packages, rootPackage } = await getPackages(process.cwd());

if (!rootPackage) throw new Error('No rootPackage');

const packagePathsByName = Object.fromEntries(
  packages.map(
    /** @returns {[string, string]} */
    (pkgObject) => [pkgObject.packageJson.name, pkgObject.dir],
  ),
);

for (const pkgObject of packages) {
  const tsconfigPath = path.join(pkgObject.dir, 'tsconfig.json');
  const tsconfigContent = JSON.parse(await fs.readFile(tsconfigPath, 'utf-8'));
  const references = Object.keys(pkgObject.packageJson.dependencies || {})
    .map((depName) => {
      const depPath = packagePathsByName[depName];
      if (!depPath) return null;
      return { path: path.relative(pkgObject.dir, depPath) };
    })
    .filter(Boolean);
  tsconfigContent.compilerOptions.tsBuildInfoFile = 'dist/build.tsbuildinfo';
  tsconfigContent.references = references.length === 0 ? undefined : references;
  await fs.writeFile(tsconfigPath, JSON.stringify(tsconfigContent, null, 2) + '\n');
}

const rootTsconfigPath = path.join(rootPackage.dir, 'tsconfig.json');
const rootTsconfigContent = JSON.parse(await fs.readFile(rootTsconfigPath, 'utf-8'));
rootTsconfigContent.references = packages.map((pkgObject) => ({ path: pkgObject.relativeDir }));
await fs.writeFile(rootTsconfigPath, JSON.stringify(rootTsconfigContent, null, 2) + '\n');

const baseTsconfigPath = path.join(rootPackage.dir, 'tsconfig.base.json');
const baseTsconfigContent = JSON.parse(await fs.readFile(baseTsconfigPath, 'utf-8'));
baseTsconfigContent.compilerOptions.paths = Object.fromEntries(
  packages.map(
    /** @returns {[string, string[]]} */
    (pkgObject) => [pkgObject.packageJson.name, [pkgObject.relativeDir]],
  ),
);
await fs.writeFile(baseTsconfigPath, JSON.stringify(baseTsconfigContent, null, 2) + '\n');
