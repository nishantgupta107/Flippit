const fs = require('fs');
const path = require('path');

const DUMPS_DIR = path.resolve(__dirname, '../dumplogs');

// Ensure dumplogs directory exists
if (!fs.existsSync(DUMPS_DIR)) {
  fs.mkdirSync(DUMPS_DIR, { recursive: true });
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

function formatLogEntryText(entry) {
  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ms = String(entry.timestamp % 1000).padStart(3, '0');
  
  let line = `[${time}.${ms}] [${entry.category.toUpperCase()}] ${entry.action}`;
  
  if (entry.playerId) {
    line += ` | Player: ${entry.playerId}`;
  }
  
  if (Object.keys(entry.details).length > 0) {
    line += ` | ${JSON.stringify(entry.details)}`;
  }
  
  if (entry.gameStateSnapshot) {
    const snap = entry.gameStateSnapshot;
    line += `\n    State: phase=${snap.phase}, active=${snap.activePlayerIndex}, deck=${snap.deckRemaining}`;
    line += `\n    Players: ${snap.players.map(p => `${p.name}(${p.handSize}cards,${p.roundScore}pts,${p.status})`).join(', ')}`;
  }
  
  return line;
}

function dumpLogsHandler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const logs = data.logs || [];
      const timestamp = data.timestamp || Date.now();
      
      if (logs.length === 0) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'No logs provided' }));
        return;
      }

      const filenameBase = formatTimestamp(timestamp);
      
      // Write JSON file
      const jsonPath = path.join(DUMPS_DIR, `events-${filenameBase}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(logs, null, 2));
      
      // Write text file
      const textPath = path.join(DUMPS_DIR, `events-${filenameBase}.txt`);
      const textContent = logs.map(formatLogEntryText).join('\n\n');
      fs.writeFileSync(textPath, textContent);
      
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        success: true, 
        count: logs.length,
        files: [
          `events-${filenameBase}.json`,
          `events-${filenameBase}.txt`
        ]
      }));
    } catch (error) {
      console.error('Error dumping logs:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to dump logs: ' + error.message }));
    }
  });
}

module.exports = { dumpLogsHandler, DUMPS_DIR };
