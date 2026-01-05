
const sharp = require('sharp');
const fs = require('fs');

// Raycast Red Gradient
const bgGradient = `
<linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" style="stop-color:#FF6B70;stop-opacity:1" />
  <stop offset="100%" style="stop-color:#E0454A;stop-opacity:1" />
</linearGradient>
`;

// Soft Shadow Filter
const shadowFilter = `
<filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
  <feOffset dx="0" dy="4" result="offsetblur"/>
  <feComponentTransfer>
    <feFuncA type="linear" slope="0.3"/>
  </feComponentTransfer>
  <feMerge> 
    <feMergeNode/>
    <feMergeNode in="SourceGraphic"/> 
  </feMerge>
</filter>
`;

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${bgGradient}
    ${shadowFilter}
  </defs>

  <!-- Background: Squircle-ish (Raycast usually masks it, but we provide a full square with rounded feel) -->
  <rect width="512" height="512" fill="url(#bgGradient)"/>
  
  <!-- Content Group with Shadow -->
  <g filter="url(#dropShadow)" fill="none" stroke="white" stroke-width="32" stroke-linecap="round" stroke-linejoin="round">
    
    <!-- Left Side: Chaos (Wavy Lines) -->
    <!-- Top Wave -->
    <path d="M120 156 Q150 126, 180 156 T240 156" opacity="0.7"/>
    <!-- Middle Wave -->
    <path d="M120 256 Q150 226, 180 256 T240 256" opacity="0.7"/>
    <!-- Bottom Wave -->
    <path d="M120 356 Q150 326, 180 356 T240 356" opacity="0.7"/>

    <!-- Divider: Vertical Line with a little arrow look -->
    <line x1="256" y1="120" x2="256" y2="392" stroke-width="4" stroke-opacity="0.4" stroke-dasharray="10 10"/>
    
    <!-- Right Side: Order (Straight Lines) -->
    <!-- Top Line -->
    <line x1="290" y1="156" x2="410" y2="156" />
    <!-- Middle Line -->
    <line x1="290" y1="256" x2="410" y2="256" />
    <!-- Bottom Line -->
    <line x1="290" y1="356" x2="410" y2="356" />
    
    <!-- Optional: A small checkmark or sparkles to indicate "Fixed" -->
    <circle cx="430" cy="380" r="12" fill="white" stroke="none" opacity="0.9"/>
  </g>
</svg>
`;

// Save SVG
fs.writeFileSync('assets/icon.svg', svg);

// Convert to PNG
sharp(Buffer.from(svg))
  .png()
  .toFile('assets/icon.png')
  .then(info => {
    console.log('Creative Icon generated:', info);
  })
  .catch(err => {
    console.error('Error generating icon:', err);
    process.exit(1);
  });
