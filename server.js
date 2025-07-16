const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Path to frontend build directory
const frontendBuildPath = path.join(__dirname, 'frontend', 'build');

// Check if frontend build exists; if not, build it
if (!fs.existsSync(frontendBuildPath) || !fs.existsSync(path.join(frontendBuildPath, 'index.html'))) {
  console.log('Building frontend...');
  execSync('cd frontend && npm install && npm run build', { stdio: 'inherit' });
} else {
  console.log('Frontend build already exists.');
}

// Start backend
console.log('Starting backend...');
require('./backend/src/index.js'); 