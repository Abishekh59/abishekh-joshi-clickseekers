#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the script directory (project root)
cd "$SCRIPT_DIR"

# Run the app from the project root
exec node dist/app.js
