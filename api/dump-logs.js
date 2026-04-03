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

function handler(req, res) {
  // Helper for compatibility between Vercel and local Node.js server
  const sendJson = (status, obj) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  if (req.method !== 'POST') {
    sendJson(405, { error: 'Method not allowed' });
    return;
  }

  // Local development might not pre-parse the body
  let getBody = () => {
    if (req.body) return Promise.resolve(req.body);
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({});
        }
      });
      req.on('error', reject);
    });
  };

  getBody().then(data => {
    const logs = data.logs || [];
    const timestamp = data.timestamp || Date.now();
    
    if (logs.length === 0) {
      sendJson(400, { error: 'No logs provided' });
      return;
    }

    try {
      const filenameBase = formatTimestamp(timestamp);
      
      try {
        if (!fs.existsSync(DUMPS_DIR)) {
          fs.mkdirSync(DUMPS_DIR, { recursive: true });
        }

        // Write files
        const jsonPath = path.join(DUMPS_DIR, `events-${filenameBase}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(logs, null, 2));
        
        const textPath = path.join(DUMPS_DIR, `events-${filenameBase}.txt`);
        const textContent = logs.map(formatLogEntryText).join('\n\n');
        fs.writeFileSync(textPath, textContent);
        
        sendJson(200, { 
          success: true, 
          count: logs.length,
          persisted: true,
          files: [`events-${filenameBase}.json`, `events-${filenameBase}.txt`]
        });
      } catch (fsError) {
        console.warn('Filesystem write failed:', fsError.message);
        sendJson(200, { 
          success: true, 
          count: logs.length,
          persisted: false,
          message: 'Logs received, but filesystem is read-only.'
        });
      }
    } catch (error) {
      console.error('Error processing logs:', error);
      sendJson(500, { error: 'Failed to process logs: ' + error.message });
    }
  }).catch(err => {
    sendJson(500, { error: 'Internal Server Error' });
  });
}

module.exports = handler;

