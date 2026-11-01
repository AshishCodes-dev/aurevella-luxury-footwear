import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendSrcDir = path.resolve(__dirname, '../src');
const deploymentDocPath = path.resolve(__dirname, '../../docs/DEPLOYMENT.md');

console.log('===============================================================');
console.log('   AUREVELLA — Deployment Documentation Environment Var Check   ');
console.log('===============================================================\n');

if (!fs.existsSync(deploymentDocPath)) {
  console.error(`FAIL: Documentation file does not exist at: ${deploymentDocPath}`);
  process.exit(1);
}

const docContent = fs.readFileSync(deploymentDocPath, 'utf8');

// Recursively find all JS files in backend/src
const getFilesRecursively = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
};

const srcFiles = getFilesRecursively(backendSrcDir);
const envVarsUsed = new Set();
const envRegex = /process\.env\.([A-Z_0-9]+)/g;

for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = envRegex.exec(content)) !== null) {
    envVarsUsed.add(match[1]);
  }
}

console.log(`Discovered ${envVarsUsed.size} distinct process.env variables across backend/src files:`);
const sortedVars = Array.from(envVarsUsed).sort();
sortedVars.forEach((v) => console.log(`  - ${v}`));

const missingFromDocs = [];
for (const varName of sortedVars) {
  // Check if variable is present in DEPLOYMENT.md
  if (!docContent.includes(varName)) {
    missingFromDocs.push(varName);
  }
}

console.log('');
if (missingFromDocs.length > 0) {
  console.error(`❌ FAIL: The following ${missingFromDocs.length} process.env variables used in backend/src are NOT documented in docs/DEPLOYMENT.md:`);
  missingFromDocs.forEach((v) => console.error(`  - ${v}`));
  process.exit(1);
}

console.log(`✔ [PASS] All ${envVarsUsed.size} backend process.env variables are verified and documented in docs/DEPLOYMENT.md.\n`);
process.exit(0);
