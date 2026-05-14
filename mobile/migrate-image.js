const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('c:/Users/Admin/Desktop/Prodution/TVK/mobile/src');
let changedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  if (content.includes('import {') && content.includes('Image') && content.includes('react-native')) {
    if (/import\s+{([^}]*\bImage\b[^}]*)}\s+from\s+['"]react-native['"]/.test(content)) {
      content = content.replace(/import\s+{([^}]*)}\s+from\s+['"]react-native['"]/, (match, p1) => {
        let newImports = p1.split(',').map(s => s.trim()).filter(s => s !== 'Image').join(', ');
        if (newImports.length === 0) return '';
        return `import { ${newImports} } from 'react-native';`;
      });
      content = "import { Image } from 'expo-image';\n" + content;
      changed = true;
    }
  }

  if (changed) {
    content = content.replace(/resizeMode=/g, 'contentFit=');
    fs.writeFileSync(f, content);
    changedCount++;
    console.log('Updated', path.basename(f));
  }
});
console.log('Total files updated:', changedCount);
