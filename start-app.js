#!/usr/bin/env node

// Use __dirname which is more reliable than require.resolve
const path = require('path');
const fs = require('fs');
const Module = require('module');

// __dirname is the directory containing this file
const projectRoot = __dirname;

// Change to the project root
process.chdir(projectRoot);

console.log(`Starting app from: ${projectRoot}`);
console.log(`Current working directory: ${process.cwd()}`);

// Register ts-config-paths for runtime module resolution
try {
  // Try to require tsconfig-paths if installed
  require('tsconfig-paths').register({
    baseUrl: projectRoot,
    paths: {
      '@generated/*': ['./generated/*']
    }
  });
  console.log(`✓ Registered tsconfig paths`);
} catch (err) {
  console.log(`Note: tsconfig-paths not available, will try direct resolution`);
  // Fallback: manually add generated folder to Node path
  process.env.NODE_PATH = projectRoot;
  Module._initPaths();
}

// Try different possible locations for app.js
const possiblePaths = [
  path.join(projectRoot, 'dist', 'src', 'app.js'),  // Most likely (src preserved in dist)
  path.join(projectRoot, 'dist', 'app.js'),          // Alternative
];

let appPath = null;
for (const possiblePath of possiblePaths) {
  console.log(`Checking: ${possiblePath}`);
  if (fs.existsSync(possiblePath)) {
    appPath = possiblePath;
    console.log(`✓ Found app at: ${appPath}`);
    break;
  }
}

if (!appPath) {
  console.error(`Error: Cannot find app.js in any expected location`);
  console.error(`Checked paths:`);
  possiblePaths.forEach(p => console.error(`  - ${p}`));
  console.error(`\nContents of ${projectRoot}:`);
  try {
    const files = fs.readdirSync(projectRoot);
    files.forEach(f => console.error(`  - ${f}`));
    
    const distPath = path.join(projectRoot, 'dist');
    if (fs.existsSync(distPath)) {
      console.error(`\nContents of dist/:`);
      fs.readdirSync(distPath).forEach(f => {
        const fullPath = path.join(distPath, f);
        const isDir = fs.statSync(fullPath).isDirectory();
        console.error(`  ${isDir ? '[DIR]' : '     '} ${f}`);
      });
      
      const srcInDist = path.join(distPath, 'src');
      if (fs.existsSync(srcInDist)) {
        console.error(`\nContents of dist/src/:`);
        fs.readdirSync(srcInDist).forEach(f => console.error(`  - ${f}`));
      }
    }
  } catch (err) {
    console.error(`Error listing files: ${err.message}`);
  }
  process.exit(1);
}

console.log(`\nLoading app from: ${appPath}\n`);

// Load and run the app
try {
  require(appPath);
} catch (err) {
  console.error(`Error loading app: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
}
