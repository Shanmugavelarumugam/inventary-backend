const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lint_results.json', 'utf8'));
const summary = data.map(file => ({
  filePath: file.filePath,
  errorCount: file.errorCount,
  warningCount: file.warningCount,
  messages: file.messages.length
})).filter(f => f.errorCount > 0 || f.warningCount > 0)
.sort((a, b) => b.errorCount - a.errorCount);

console.log(JSON.stringify(summary.slice(0, 20), null, 2));
