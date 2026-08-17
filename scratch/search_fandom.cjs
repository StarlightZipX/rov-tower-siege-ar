const https = require('https');

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

async function searchWiki(query) {
  const url = `https://arenaofvalor.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
  return await fetchJson(url);
}

async function searchFiles(prefix) {
  const url = `https://arenaofvalor.fandom.com/api.php?action=query&list=allimages&aiprefix=${encodeURIComponent(prefix)}&ailimit=50&format=json`;
  return await fetchJson(url);
}

async function main() {
  console.log('Searching for voice/audio pages...');
  const res1 = await searchWiki('voice lines');
  console.log('Voice lines search:', res1.query ? res1.query.search : 'none');

  const res2 = await searchWiki('announcer');
  console.log('Announcer search:', res2.query ? res2.query.search : 'none');

  const res3 = await searchFiles('Arthur');
  console.log('Arthur files:', res3.query ? res3.query.allimages.map(x => x.name) : 'none');

  const res4 = await searchFiles('Voice');
  console.log('Voice files:', res4.query ? res4.query.allimages.map(x => x.name) : 'none');
}

main().catch(console.error);
