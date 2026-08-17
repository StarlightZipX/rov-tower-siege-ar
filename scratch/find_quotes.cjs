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

async function getWikiText(wiki, page) {
  const url = `https://${wiki}.fandom.com/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json`;
  const res = await fetchJson(url);
  return res.parse && res.parse.wikitext ? res.parse.wikitext['*'] : '';
}

async function main() {
  const mlText = await getWikiText('mobile-legends', 'Announcer');
  fs.writeFileSync('scratch/ml_announcer.txt', mlText);

  const lolText = await getWikiText('leagueoflegends', 'Announcer/Classic');
  fs.writeFileSync('scratch/lol_announcer.txt', lolText);

  console.log('Saved wikitexts. Searching lines...');
  
  // Search for lines matching Welcome, Victory, Defeat, Tower, Kill
  const lines = lolText.split('\n');
  lines.forEach(l => {
    if (/welcome|victory|defeat|turret|tower|first blood|double kill|triple kill|legendary/i.test(l)) {
      console.log('LoL Line:', l.trim().substring(0, 140));
    }
  });

  const mlLines = mlText.split('\n');
  mlLines.forEach(l => {
    if (/welcome|victory|defeat|turret|tower|first blood|double kill|triple kill|legendary/i.test(l)) {
      console.log('ML Line:', l.trim().substring(0, 140));
    }
  });
}

main().catch(console.error);
