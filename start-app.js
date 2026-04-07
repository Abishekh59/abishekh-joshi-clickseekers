#!/usr/bin/env node

// Use __dirname which is more reliable than require.resolve
const path = require('path');
const fs = require('fs');

// __dirname is the directory containing this file
const projectRoot = __dirname;

// Change to the project root
process.chdir(projectRoot);

console.log(`Starting app from: ${projectRoot}`);
console.log(`Current working directory: ${process.cwd()}`);

// Verify dist/app.js exists
const appPath = path.join(projectRoot, 'dist', 'app.js');
console.log(`Looking for app at: ${appPath}`);

if (!fs.existsSync(appPath)) {
  console.error(`Error: Cannot find ${appPath}`);
  console.error(`Contents of ${projectRoot}:`);
  try {
    const files = fs.readdirSync(projectRoot);
    files.forEach(f => console.error(`  - ${f}`));
    
    const distPath = path.join(projectRoot, 'dist');
    if (fs.existsSync(distPath)) {
      console.error(`\nContents of dist/:`);
      fs.readdirSync(distPath).forEach(f => console.error(`  - ${f}`));
    }
  } catch (err) {
    console.error(`Error listing files: ${err.message}`);
  }
  process.exit(1);
}

console.log(`Loading app from: ${appPath}\n`);

// Load and run the app
try {
  require(appPath);
} catch (err) {
  console.error(`Error loading app: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
}
