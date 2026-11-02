import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const bucketName = process.env.YC_BUCKET || 'ski-form-studio';
const profile = process.env.YC_PROFILE || 'exchange-street';

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.json': return 'application/json';
    case '.ico': return 'image/x-icon';
    case '.txt':
    case '': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function getFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getFiles(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

console.log(`Starting deployment to Yandex Cloud bucket: ${bucketName}...`);
console.log(`Using YC profile: ${profile}`);

const files = getFiles(distDir);
console.log(`Found ${files.length} files to upload.`);

for (const file of files) {
  const relativePath = path.relative(distDir, file).replace(/\\/g, '/');
  const mimeType = getMimeType(file);
  const s3Uri = `s3://${bucketName}/${relativePath}`;
  const isHtml = relativePath.endsWith('.html');
  const cacheControl = isHtml ? 'no-cache, no-store, must-revalidate' : 'no-cache, must-revalidate';

  console.log(`Uploading ${relativePath} -> ${s3Uri} (${mimeType})`);
  const cmd = `yc storage s3 cp "${file}" "${s3Uri}" --content-type "${mimeType}" --cache-control "${cacheControl}" --profile "${profile}"`;
  execSync(cmd, { stdio: 'inherit' });
}

console.log('\nDeployment completed successfully!');
console.log(`Website URL: https://${bucketName}.website.yandexcloud.net/`);
