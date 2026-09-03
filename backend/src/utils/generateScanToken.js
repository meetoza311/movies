const crypto = require('crypto');

function generateScanToken() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { generateScanToken };
