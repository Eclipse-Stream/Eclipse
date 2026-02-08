/**
 * Script to generate tray icons from SVG logos
 * Converts the Guardian logo SVGs to PNG for Electron tray
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOGO_DIR = join(__dirname, '../src/assets/logo');
const RESOURCES_DIR = join(__dirname, '../resources');

// Tray icon size (Windows recommends 16x16)
const TRAY_SIZE = 16;

// Icon mappings: source SVG -> target PNG
const ICONS = [
  { src: 'logo-tray.svg', dest: 'tray-icon-pausing.png' },
  { src: 'logo-tray-streaming.svg', dest: 'tray-icon-playing.png' },
  { src: 'logo-tray-mono.svg', dest: 'tray-icon-locked.png' },
];

async function generateIcon(srcFile, destFile) {
  const srcPath = join(LOGO_DIR, srcFile);
  const destPath = join(RESOURCES_DIR, destFile);

  try {
    const svgBuffer = readFileSync(srcPath);

    await sharp(svgBuffer)
      .resize(TRAY_SIZE, TRAY_SIZE)
      .png()
      .toFile(destPath);

    console.log(`✓ Generated ${destFile}`);
  } catch (error) {
    console.error(`✗ Failed to generate ${destFile}:`, error.message);
  }
}

async function main() {
  console.log('Generating tray icons...\n');

  for (const icon of ICONS) {
    await generateIcon(icon.src, icon.dest);
  }

  console.log('\nDone!');
}

main();
