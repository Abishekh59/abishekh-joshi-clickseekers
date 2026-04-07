#!/usr/bin/env node

// Ensure we're running from the project root
const path = require('path');
const fs = require('fs');

// Get the directory where this script is
const scriptDir = path.dirname(require.resolve(__filename));

// Change to the project root
process.chdir(scriptDir);

// Verify dist/app.js exists
const appPath = path.join(scriptDir, 'dist', 'app.js');
if (!fs.existsSync(appPath)) {
  console.error(`Error: Cannot find ${appPath}`);
  console.error(`Current working directory: ${process.cwd()}`);
  console.error(`Available files in ${scriptDir}:`, fs.readdirSync(scriptDir));
  process.exit(1);
}

// Load and run the app
require('./dist/app.js');
