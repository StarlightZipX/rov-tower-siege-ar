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
  const res = await searchWikiAudio('leagueoflegends', 'Hextech');
  console.log('Hextech files:', res.query ? res.query.allimages.map(x => x.name) : 'none');

  const res2 = await searchWikiAudio('leagueoflegends', 'Loot');
  console.log('Loot files:', res2.query ? res2.query.allimages.map(x => x.name) : 'none');

  const res3 = await searchWikiAudio('leagueoflegends', 'SFX');
  console.log('SFX files:', res3.query ? res3.query.allimages.map(x => x.name) : 'none');
}

main().catch(console.error);
