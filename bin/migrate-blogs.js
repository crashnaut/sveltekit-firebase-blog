#!/usr/bin/env node

import('../dist/scripts/migrate-blogs.js').then(module => {
  // The main function is automatically called in the module
}).catch(error => {
  console.error('Error running blog migration:', error);
  process.exit(1);
});
