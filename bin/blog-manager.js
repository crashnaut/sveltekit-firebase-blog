#!/usr/bin/env node

import('../dist/scripts/blog-manager.js').then(module => {
  // The main function is automatically called in the module
}).catch(error => {
  console.error('Error running blog manager:', error);
  process.exit(1);
});
