import { createMDX } from 'fumadocs-mdx/next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // This app has its own lockfile, separate from the Vite/Tauri app one level up.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
};

export default withMDX(config);
