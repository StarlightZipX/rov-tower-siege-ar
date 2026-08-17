const https = require('https');
const fs = require('fs');
const path = require('path');

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

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(downloadFile(res.headers.location, dest));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function getImageUrl(wiki, filename) {
  const url = `https://${wiki}.fandom.com/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json`;
  const res = await fetchJson(url);
  if (res.query && res.query.pages) {
    const p = Object.values(res.query.pages)[0];
    if (p && p.imageinfo && p.imageinfo[0]) {
      return p.imageinfo[0].url;
    }
  }
  return null;
}

async function main() {
  const audioDir = path.join(__dirname, '../public/assets/audio');
  const items = [
    { wiki: 'leagueoflegends', file: 'Hextech_Alternator_passive_SFX.ogg', out: 'summon_charge.ogg' },
    { wiki: 'leagueoflegends', file: 'Hextech_Alternator_trigger_SFX.ogg', out: 'summon_reveal.ogg' }
  ];

  for (const item of items) {
    const fileUrl = await getImageUrl(item.wiki, item.file);
    if (fileUrl) {
      const dest = path.join(audioDir, item.out);
      await downloadFile(fileUrl, dest);
      console.log(`Saved ${item.out} (${fs.statSync(dest).size} bytes)`);
    }
  }
}

main().catch(console.error);
