/**
 * Script to generate Windows ICO file for Electron Builder
 * Uses sharp to combine multiple PNG sizes into a single ICO
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resourcesDir = path.join(__dirname, '..', 'resources', 'icons');
const buildResourcesDir = path.join(__dirname, '..', 'build-resources');

// ICO file format constants
const ICO_HEADER_SIZE = 6;
const ICO_ENTRY_SIZE = 16;

// Required sizes for Windows ICO (256 is stored as PNG, others as BMP)
const sizes = [16, 24, 32, 48, 64, 128, 256];

async function createIcoBuffer(pngBuffers) {
  const numImages = pngBuffers.length;
  const headerSize = ICO_HEADER_SIZE + (numImages * ICO_ENTRY_SIZE);
  
  let dataOffset = headerSize;
  const entries = [];
  
  for (const { size, buffer } of pngBuffers) {
    entries.push({
      width: size === 256 ? 0 : size,
      height: size === 256 ? 0 : size,
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      bytesInRes: buffer.length,
      imageOffset: dataOffset
    });
    dataOffset += buffer.length;
  }
  
  // Create ICO header
  const header = Buffer.alloc(ICO_HEADER_SIZE);
  header.writeUInt16LE(0, 0);      // Reserved
  header.writeUInt16LE(1, 2);      // Type: 1 = ICO
  header.writeUInt16LE(numImages, 4); // Number of images
  
  // Create entry directory
  const directory = Buffer.alloc(numImages * ICO_ENTRY_SIZE);
  entries.forEach((entry, i) => {
    const offset = i * ICO_ENTRY_SIZE;
    directory.writeUInt8(entry.width, offset);
    directory.writeUInt8(entry.height, offset + 1);
    directory.writeUInt8(entry.colorCount, offset + 2);
    directory.writeUInt8(entry.reserved, offset + 3);
    directory.writeUInt16LE(entry.planes, offset + 4);
    directory.writeUInt16LE(entry.bitCount, offset + 6);
    directory.writeUInt32LE(entry.bytesInRes, offset + 8);
    directory.writeUInt32LE(entry.imageOffset, offset + 12);
  });
  
  // Combine all buffers
  return Buffer.concat([header, directory, ...pngBuffers.map(p => p.buffer)]);
}

async function generateIco() {
  console.log('🎨 Generating icon.ico for Electron Builder...');
  
  const pngBuffers = [];
  
  for (const size of sizes) {
    const pngPath = path.join(resourcesDir, `icon-${size}.png`);
    
    if (!fs.existsSync(pngPath)) {
      // Generate from largest available icon
      const sourcePath = path.join(resourcesDir, 'icon-512.png');
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source icon not found: ${sourcePath}`);
      }
      
      console.log(`  Resizing icon-512.png → ${size}x${size}`);
      const buffer = await sharp(sourcePath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      
      pngBuffers.push({ size, buffer });
    } else {
      console.log(`  Using existing icon-${size}.png`);
      const buffer = await sharp(pngPath).png().toBuffer();
      pngBuffers.push({ size, buffer });
    }
  }
  
  // Sort by size (smallest first for ICO format)
  pngBuffers.sort((a, b) => a.size - b.size);
  
  const icoBuffer = await createIcoBuffer(pngBuffers);
  const outputPath = path.join(buildResourcesDir, 'icon.ico');
  
  fs.writeFileSync(outputPath, icoBuffer);
  console.log(`✅ Generated: ${outputPath}`);
}

generateIco().catch(err => {
  console.error('❌ Error generating ICO:', err);
  process.exit(1);
});
