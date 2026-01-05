
const sharp = require('sharp');
const fs = require('fs');

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="512" height="512" fill="#FF5A5F"/>
  
  <!-- Divider -->
  <line x1="256" y1="100" x2="256" y2="412" stroke="white" stroke-width="4" stroke-opacity="0.3" stroke-linecap="round"/>
  
  <!-- Text A -->
  <text x="128" y="320" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="200" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle">A</text>
        
  <!-- Text 文 -->
  <text x="384" y="320" 
        font-family="'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif" 
        font-size="200" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle">文</text>
</svg>
`;

// First save the SVG for reference (and in case user wants it)
fs.writeFileSync('assets/icon.svg', svg);

// Convert to PNG using Sharp
sharp(Buffer.from(svg))
  .png()
  .toFile('assets/icon.png')
  .then(info => {
    console.log('Icon generated successfully:', info);
  })
  .catch(err => {
    console.error('Error generating icon:', err);
    process.exit(1);
  });
