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

async function searchWikiAudio(wiki, term) {
  const url = `https://${wiki}.fandom.com/api.php?action=query&list=allimages&aiprefix=${encodeURIComponent(term)}&ailimit=50&format=json`;
  return await fetchJson(url);
}

async function main() {
  const wikis = ['mobile-legends', 'leagueoflegends', 'arenaofvalor', 'dota2'];
  for (const w of wikis) {
    console.log(`Checking ${w}...`);
    const res = await fetchJson(`https://${w}.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent('announcer')}&format=json`);
    console.log(`${w} announcer pages:`, res.query ? res.query.search.slice(0, 3) : 'none');
  }
}

main().catch(console.error);
