
const sharp = require('sharp');
const fs = require('fs');

// Raycast Red Gradient
const bgGradient = `
<linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" style="stop-color:#FF6B70;stop-opacity:1" />
  <stop offset="100%" style="stop-color:#E0454A;stop-opacity:1" />
</linearGradient>
`;

// Calculate coordinates
// Canvas: 512x512
// Center: 256, 256

// Rows
const strokeWidth = 36;
const rowGap = 70; // gap between center of lines
const yMid = 256;
const yTop = yMid - rowGap;
const yBot = yMid + rowGap;

// Columns
const centerX = 256;
const contentOffset = 50; // distance from center line
const contentWidth = 140;

const rightX1 = centerX + contentOffset;
const rightX2 = rightX1 + contentWidth;

const leftX2 = centerX - contentOffset;
const leftX1 = leftX2 - contentWidth; // 66

// Wave calculation (Simplified Sine-like wave)
// Width = 140. Let's do roughly 1.5 cycles or so to look "wavy"
// M startX y Q cp1x (y-amp) midX y T endX y
const amp = 15;
// Split into two curves for smoother look
// Segment 1: 70px width.
// Left Start: leftX1, y
// Left End: leftX2, y

// We will construct the wave path string dynamically
const wavePath = (y) => {
    // Start
    let d = `M ${leftX1} ${y} `;
    // First hump (up)
    d += `C ${leftX1 + 35} ${y - 30}, ${leftX1 + 35} ${y + 30}, ${leftX1 + 70} ${y} `;
    // Second hump (down/up continuation)
    d += `S ${leftX1 + 105} ${y - 30}, ${leftX2} ${y}`;
    return d;
};

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${bgGradient}
  </defs>

  <!-- Background -->
  <rect width="512" height="512" fill="url(#bgGradient)"/>
  
  <!-- Divider -->
  <line x1="256" y1="110" x2="256" y2="402" stroke="white" stroke-width="4" stroke-opacity="0.3" stroke-dasharray="12 12" stroke-linecap="round"/>
  
  <!-- Content Group -->
  <g fill="none" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    
    <!-- Left Side: Chaos (Wavy Lines) -->
    <!-- Opacity reduced slightly to differentiate "bad" state, but kept sharp -->
    <g opacity="0.6">
        <path d="${wavePath(yTop)}" />
        <path d="${wavePath(yMid)}" />
        <path d="${wavePath(yBot)}" />
    </g>

    <!-- Right Side: Order (Straight Lines) -->
    <g opacity="1.0">
        <line x1="${rightX1}" y1="${yTop}" x2="${rightX2}" y2="${yTop}" />
        <line x1="${rightX1}" y1="${yMid}" x2="${rightX2}" y2="${yMid}" />
        <line x1="${rightX1}" y1="${yBot}" x2="${rightX2}" y2="${yBot}" />
    </g>
    
  </g>
</svg>
`;

// Save SVG
fs.writeFileSync('assets/icon.svg', svg);

// Convert to PNG
// increasing density to 300 dpi equivalent for sharper resizing if needed, though 512px is absolute.
// But sharp defaults are usually good. 
sharp(Buffer.from(svg), { density: 72 }) 
  .resize(512, 512) // Ensure output is exactly 512
  .png()
  .toFile('assets/icon.png')
  .then(info => {
    console.log('Refined Icon generated:', info);
  })
  .catch(err => {
    console.error('Error generating icon:', err);
    process.exit(1);
  });
