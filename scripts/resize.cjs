// RESIZE DEFAULT - USED FOR RESIZING IMAGES TO 256x256 -> you can test using the default.webp image on input folder, or add your own .webp images to the input folder and run this script -> node resize.cjs

// Instalation:
// npm install sharp
// node resize.cjs

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, 'input'); // Default input directory for original images
const outputDir = path.join(__dirname, 'output'); // Resized images will be saved here

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

fs.readdirSync(inputDir).forEach(file => {
  if (!file.endsWith('.webp')) return; 

  const inputPath = path.join(inputDir, file);
  const outputPath = path.join(outputDir, file);

  sharp(inputPath)
    .resize(256, 256, {
      fit: 'cover',
      kernel: sharp.kernel.lanczos3
    })
    .sharpen({
      sigma: 1.2
    })
    .webp({
      quality: 95,
      effort: 6
    })
    .toFile(outputPath)
    .then(() => console.log(`✔ ${file}`))
    .catch(err => console.error(`Erro em ${file}`, err));
});