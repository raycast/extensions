// Script to generate command icon for Raycast
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname);
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create a Zotero-inspired icon
function createCommandIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#2980b9'; // Zotero-like blue color
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();
  
  // Document shape
  ctx.fillStyle = '#ffffff';
  const docWidth = size * 0.6;
  const docHeight = size * 0.7;
  const docX = (size - docWidth) / 2;
  const docY = (size - docHeight) / 2;
  
  ctx.fillRect(docX, docY, docWidth, docHeight);
  
  // Document lines
  ctx.fillStyle = '#2980b9';
  const lineHeight = size * 0.08;
  const lineWidth = docWidth * 0.7;
  const lineX = docX + (docWidth - lineWidth) / 2;
  
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(
      lineX, 
      docY + docHeight * 0.3 + i * (lineHeight * 1.5), 
      lineWidth, 
      lineHeight
    );
  }
  
  // Letter Z (for Zotero)
  ctx.fillStyle = '#e74c3c';
  ctx.font = `bold ${size * 0.3}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', size/2, size/2 - size * 0.15);
  
  return canvas.toBuffer('image/png');
}

// Create command icon (512x512 is recommended for Raycast)
const iconBuffer = createCommandIcon(512);
fs.writeFileSync(path.join(assetsDir, 'command-icon.png'), iconBuffer);
console.log('Command icon created successfully!'); 