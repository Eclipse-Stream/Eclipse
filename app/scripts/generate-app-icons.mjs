/**
 * Script to generate app icons from SVG logo
 * Creates PNG icons in various sizes for Electron
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOGO_DIR = join(__dirname, '../src/assets/logo');
const RESOURCES_DIR = join(__dirname, '../resources');

// Icon sizes needed for Windows/Electron
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512];

async function generateIcons() {
  const srcPath = join(LOGO_DIR, 'logo.svg');
  const svgBuffer = readFileSync(srcPath);

  console.log('Generating app icons...\n');

  for (const size of SIZES) {
    const destPath = join(RESOURCES_DIR, `icon-${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(destPath);

    console.log(`✓ Generated icon-${size}.png`);
  }

  // Also create a main icon.png at 256px (commonly used)
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(join(RESOURCES_DIR, 'icon.png'));

  console.log('✓ Generated icon.png (256x256)');

  console.log('\nDone! Use icon.png for BrowserWindow icon property.');
  console.log('For .ico generation, use: https://convertico.com/ or electron-icon-builder');
}

generateIcons();
