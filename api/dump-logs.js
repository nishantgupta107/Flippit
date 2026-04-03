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
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Vercel pre-parses JSON body in req.body
  const data = req.body || {};
  const logs = data.logs || [];
  const timestamp = data.timestamp || Date.now();
  
  if (logs.length === 0) {
    res.status(400).json({ error: 'No logs provided' });
    return;
  }

  try {
    const filenameBase = formatTimestamp(timestamp);
    
    // Note: Vercel serverless functions have a read-only filesystem except for /tmp
    // This part will fail in production if DUMPS_DIR is not correctly configured
    // We try/catch it so the function still succeeds 200 (logs are received at least)
    try {
      if (!fs.existsSync(DUMPS_DIR)) {
        fs.mkdirSync(DUMPS_DIR, { recursive: true });
      }

      // Write JSON file
      const jsonPath = path.join(DUMPS_DIR, `events-${filenameBase}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(logs, null, 2));
      
      // Write text file
      const textPath = path.join(DUMPS_DIR, `events-${filenameBase}.txt`);
      const textContent = logs.map(formatLogEntryText).join('\n\n');
      fs.writeFileSync(textPath, textContent);
      
      res.status(200).json({ 
        success: true, 
        count: logs.length,
        persisted: true,
        files: [
          `events-${filenameBase}.json`,
          `events-${filenameBase}.txt`
        ]
      });
    } catch (fsError) {
      console.warn('Filesystem write failed (expected on Vercel):', fsError.message);
      // In production, we just log that we received them but couldn't save to disk
      res.status(200).json({ 
        success: true, 
        count: logs.length,
        persisted: false,
        message: 'Logs received, but filesystem is read-only. Consider using a DB for persistent logs.'
      });
    }

  } catch (error) {
    console.error('Error processing logs:', error);
    res.status(500).json({ error: 'Failed to process logs: ' + error.message });
  }
}

module.exports = handler;

