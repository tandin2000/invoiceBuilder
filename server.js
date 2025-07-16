const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Path to frontend build directory
// const frontendBuildPath = path.join(__dirname, 'frontend', 'build');

// // Always remove previous build (if exists)
// if (fs.existsSync(frontendBuildPath)) {
//   console.log('Removing previous frontend build...');
//   fs.rmSync(frontendBuildPath, { recursive: true, force: true });
// }

// console.log('Building frontend...');
// execSync('cd frontend && npm install && npm run build', { stdio: 'inherit' });

// Start backend
console.log('Starting backend...');
require('./backend/src/index.js'); 