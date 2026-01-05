
const fs = require('fs');
const PImage = require('pureimage');

const size = 512;
const img = PImage.make(size, size);
const ctx = img.getContext('2d');

// Background: Rounded Rectangle
// Since pureimage might not have easy rounded rect, we'll draw a rect.
// Raycast icons usually have transparent corners if they are shapes, or full bleed squares.
// Let's do a full bleed square with Raycast Red.
ctx.fillStyle = '#FF5A5F';
ctx.fillRect(0, 0, size, size);

// Set line styles for text
ctx.strokeStyle = '#FFFFFF';
ctx.lineWidth = 24;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Draw "A"
// Center roughly at x=140
const ax = 140;
const ay_top = 150;
const ay_bot = 350;
const a_width = 120;

ctx.beginPath();
// Left leg
ctx.moveTo(ax - a_width/2, ay_bot);
ctx.lineTo(ax, ay_top);
// Right leg
ctx.lineTo(ax + a_width/2, ay_bot);
ctx.stroke();

// Middle bar
ctx.beginPath();
ctx.moveTo(ax - a_width/4, (ay_top + ay_bot)/2 + 20);
ctx.lineTo(ax + a_width/4, (ay_top + ay_bot)/2 + 20);
ctx.stroke();

// Draw "文"
// Center roughly at x=372
const wx = 372;
const wy_top = 150;
const wy_bot = 350;

ctx.beginPath();
// Top dot (short vertical line)
ctx.moveTo(wx, wy_top);
ctx.lineTo(wx, wy_top + 30);
ctx.stroke();

// Horizontal line
ctx.beginPath();
ctx.moveTo(wx - 70, wy_top + 50);
ctx.lineTo(wx + 70, wy_top + 50);
ctx.stroke();

// Legs
// Left swoosh
ctx.beginPath();
ctx.moveTo(wx, wy_top + 50);
ctx.quadraticCurveTo(wx - 20, wy_top + 150, wx - 80, wy_bot);
ctx.stroke();

// Right swoosh
ctx.beginPath();
ctx.moveTo(wx, wy_top + 50);
ctx.quadraticCurveTo(wx + 20, wy_top + 150, wx + 80, wy_bot);
ctx.stroke();

// Divider line (Optional, maybe a subtle line in between)
ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(256, 100);
ctx.lineTo(256, 412);
ctx.stroke();

// Save to file
PImage.encodePNGToStream(img, fs.createWriteStream('assets/icon.png')).then(() => {
    console.log("Icon generated successfully!");
}).catch((e) => {
    console.error("Failed to generate icon", e);
    process.exit(1);
});
