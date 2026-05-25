const fs = require('fs');
try {
  const data = JSON.parse(fs.readFileSync('lint_results_2.json', 'utf8'));
  const summary = data.map(file => ({
    filePath: file.filePath.replace('/Users/btc001a/Downloads/MyFolder/inventary-backend/', ''),
    errorCount: file.errorCount,
    warningCount: file.warningCount,
    messages: file.messages.length
  })).filter(f => f.errorCount > 0 || f.warningCount > 0)
  .sort((a, b) => b.errorCount - a.errorCount);

  console.log(JSON.stringify(summary, null, 2));
  
  const totalErrors = summary.reduce((sum, f) => sum + f.errorCount, 0);
  const totalWarnings = summary.reduce((sum, f) => sum + f.warningCount, 0);
  console.log(`Total Errors: ${totalErrors}, Total Warnings: ${totalWarnings}`);
} catch (e) {
  console.error("Error reading JSON:", e.message);
}
