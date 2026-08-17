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
  const heroes = ['Arthur', 'Valhein', 'Krixi', 'Tel\'Annas', 'Violet', 'Zill', 'Raz'];
  for (const h of heroes) {
    const res = await fetchJson(`https://arenaofvalor.fandom.com/api.php?action=parse&page=${encodeURIComponent(h)}/Audio&prop=wikitext|images&format=json`);
    console.log(`${h}/Audio:`, res.parse ? res.parse.images : 'not found');
    if (!res.parse) {
      const res2 = await fetchJson(`https://arenaofvalor.fandom.com/api.php?action=parse&page=${encodeURIComponent(h)}/Quotes&prop=wikitext|images&format=json`);
      console.log(`${h}/Quotes:`, res2.parse ? res2.parse.images : 'not found');
    }
  }
}

main().catch(console.error);
