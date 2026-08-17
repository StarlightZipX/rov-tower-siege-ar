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
  const mlRes = await fetchJson('https://mobile-legends.fandom.com/api.php?action=parse&page=Announcer&prop=wikitext|images&format=json');
  console.log('ML Announcer images count:', mlRes.parse ? mlRes.parse.images.length : 'none');
  if (mlRes.parse && mlRes.parse.images) {
    const oggs = mlRes.parse.images.filter(x => x.endsWith('.ogg') || x.endsWith('.mp3') || x.endsWith('.wav'));
    console.log('ML Audio files:', oggs);
  }

  const lolRes = await fetchJson('https://leagueoflegends.fandom.com/api.php?action=parse&page=Announcer/Classic&prop=wikitext|images&format=json');
  console.log('LoL Announcer images count:', lolRes.parse ? lolRes.parse.images.length : 'none');
  if (lolRes.parse && lolRes.parse.images) {
    const oggs = lolRes.parse.images.filter(x => x.endsWith('.ogg') || x.endsWith('.mp3') || x.endsWith('.wav'));
    console.log('LoL Audio files sample:', oggs.slice(0, 30));
  }
}

main().catch(console.error);
