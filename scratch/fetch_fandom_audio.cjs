const https = require('https');
const fs = require('fs');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Searching all audio files on Arena of Valor Wiki...');
  const url = 'https://arenaofvalor.fandom.com/api.php?action=query&list=allimages&ailimit=500&aitype=audio&format=json';
  const data = await fetchJson(url);
  console.log('Results:', data);
  if (data && data.query && data.query.allimages) {
    console.log('Found audio files:', data.query.allimages.length);
    console.log('Sample audio files:', data.query.allimages.slice(0, 20));
  }
}

main().catch(console.error);
