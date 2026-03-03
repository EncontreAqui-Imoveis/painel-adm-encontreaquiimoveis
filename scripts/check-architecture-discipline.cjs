const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (/\.(svelte|ts|js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeImport(source) {
  return source.replace(/\\/g, '/');
}

function extractImports(content) {
  const imports = [];
  const importRegex = /import[\s\S]*?from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(normalizeImport(match[1]));
  }
  return imports;
}

function toProjectRelative(filePath) {
  return normalizeImport(path.relative(root, filePath));
}

function isUiPrimitive(relPath) {
  return relPath.startsWith('src/lib/components/ui/');
}

function isChartComponent(relPath) {
  return relPath.startsWith('src/lib/components/charts/');
}

function isSvelteView(relPath) {
  return relPath.endsWith('.svelte') && relPath.startsWith('src/lib/');
}

function isArchitecturallyRelevantImport(importPath) {
  if (
    importPath.startsWith('svelte') ||
    importPath === 'lucide-svelte' ||
    importPath === 'svelte-sonner'
  ) {
    return false;
  }

  if (
    importPath.includes('/types') ||
    importPath.endsWith('/types') ||
    importPath.includes('/components/ui/') ||
    importPath.includes('/components/charts/')
  ) {
    return false;
  }

  if (
    /\.(svg|png|jpg|jpeg|webp)$/i.test(importPath) ||
    importPath.startsWith('../static/') ||
    importPath.startsWith('$lib/components/') ||
    (importPath.endsWith('.svelte') && (importPath.startsWith('./') || importPath.startsWith('../')))
  ) {
    return false;
  }

  return true;
}

const files = walk(srcRoot);
const hardViolations = [];
const consultiveWarnings = [];

for (const filePath of files) {
  const relPath = toProjectRelative(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = extractImports(content);

  if (isUiPrimitive(relPath) || isChartComponent(relPath)) {
    for (const importPath of imports) {
      const forbidden =
        importPath === '$lib/apiClient' ||
        importPath === '$lib/api' ||
        importPath === '$lib/store' ||
        importPath === '$lib/httpError' ||
        importPath === '$lib/observability' ||
        importPath === 'axios' ||
        importPath.endsWith('/apiClient') ||
        importPath.endsWith('/api') ||
        importPath === './store' ||
        importPath === '../store';

      if (forbidden) {
        hardViolations.push({
          file: relPath,
          reason: `componente visual puro depende de camada operacional (${importPath})`,
        });
      }
    }
  }

  if (
    relPath !== 'src/lib/apiClient.ts' &&
    relPath !== 'src/lib/mediaUploadService.ts' &&
    imports.includes('axios')
  ) {
    hardViolations.push({
      file: relPath,
      reason: 'import direto de axios fora do client central',
    });
  }

  if (
    isSvelteView(relPath) &&
    !isUiPrimitive(relPath) &&
    imports.some(
      (entry) =>
        entry === '$lib/store' ||
        entry === './store' ||
        entry === '../store'
    )
  ) {
    hardViolations.push({
      file: relPath,
      reason: 'view depende diretamente do store global',
    });
  }

  if (
    isSvelteView(relPath) &&
    imports.some((entry) => entry === '$lib/api' || entry === './api' || entry.endsWith('/api'))
  ) {
    hardViolations.push({
      file: relPath,
      reason: 'view depende diretamente de configuracao HTTP/baseURL',
    });
  }

  const relevantImports = [...new Set(imports)].filter(isArchitecturallyRelevantImport);
  if (relevantImports.length >= 7) {
    consultiveWarnings.push({
      file: relPath,
      reason: `fan-out arquitetural alto (${relevantImports.length} dependencias)`,
    });
  }
}

if (hardViolations.length > 0) {
  console.error('Violacoes duras de disciplina arquitetural encontradas no painelweb:');
  for (const violation of hardViolations) {
    console.error(`- ${violation.file}: ${violation.reason}`);
  }
  process.exit(1);
}

if (consultiveWarnings.length > 0) {
  console.log('Alertas consultivos de disciplina arquitetural:');
  for (const warning of consultiveWarnings) {
    console.log(`- ${warning.file}: ${warning.reason}`);
  }
} else {
  console.log('Nenhum alerta consultivo encontrado.');
}
