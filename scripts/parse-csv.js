const fs = require('fs');
const path = require('path');

try {
  // Read CSV file
  const csvPath = path.join(__dirname, '../csv/名作ゲームデータベース - csv用.csv');
  const csv = fs.readFileSync(csvPath, 'utf-8');

  const lines = csv.trim().split('\n');
  const games = {};

  lines.slice(1).forEach((line, idx) => {
    // Simple CSV parser - handle basic cases
    const parts = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    if (parts.length >= 5) {
      const hardware = parts[0];
      const title = parts[1];
      const year = parts[2];
      const genre = parts[4];
      const description = parts[5] || '';

      if (hardware && title && year) {
        if (!games[hardware]) games[hardware] = [];
        games[hardware].push({
          title,
          year: parseInt(year) || 0,
          genre: genre || 'UNKNOWN',
          description
        });
      }
    }
  });

  // Output as JavaScript export
  const output = `// Generated from CSV\nexport const MASTERPIECE_DB = ${JSON.stringify(games, null, 2)};\n`;

  fs.writeFileSync(path.join(__dirname, '../src/gameDatabase.js'), output, 'utf-8');
  console.log('✓ gameDatabase.js generated successfully');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
