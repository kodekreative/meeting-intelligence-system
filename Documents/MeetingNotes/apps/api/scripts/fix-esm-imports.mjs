import fs from 'fs'
import path from 'path'

const distDir = path.resolve(process.cwd(), 'dist')

function isRelative(spec) {
  return spec.startsWith('./') || spec.startsWith('../')
}

function hasExtension(spec) {
  return /\.(mjs|cjs|js|json)$/.test(spec)
}

function fixSpecifier(spec) {
  if (!isRelative(spec)) return spec
  if (hasExtension(spec)) return spec
  return `${spec}.js`
}

function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8')

  // import ... from '...'
  let updated = code.replace(/(import\s+[^;]*?from\s+)(["'])([^"']+)(\2)/g, (m, pre, quote, spec, postQuote) => {
    return `${pre}${quote}${fixSpecifier(spec)}${postQuote}`
  })

  // export ... from '...'
  updated = updated.replace(/(export\s+[^;]*?from\s+)(["'])([^"']+)(\2)/g, (m, pre, quote, spec, postQuote) => {
    return `${pre}${quote}${fixSpecifier(spec)}${postQuote}`
  })

  // dynamic import('...')
  updated = updated.replace(/(import\s*\(\s*)(["'])([^"']+)(\2)(\s*\))/g, (m, pre, quote, spec, postQuote, suffix) => {
    return `${pre}${quote}${fixSpecifier(spec)}${postQuote}${suffix}`
  })

  if (updated !== code) {
    fs.writeFileSync(filePath, updated, 'utf8')
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      walk(full)
    } else if (entry.endsWith('.js')) {
      processFile(full)
    }
  }
}

if (!fs.existsSync(distDir)) {
  console.error('dist directory not found:', distDir)
  process.exit(1)
}

walk(distDir)
console.log('✓ Fixed ESM import specifiers in dist')
