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
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const soundsToFetch = [
    { wiki: 'leagueoflegends', file: 'Announcer Female1 114.ogg', out: 'victory.ogg' },
    { wiki: 'leagueoflegends', file: 'Announcer Female1 051.ogg', out: 'defeat.ogg' },
    { wiki: 'leagueoflegends', file: 'Announcer Female1 052.ogg', out: 'first_blood.ogg' },
    { wiki: 'leagueoflegends', file: 'Announcer Female1 006.ogg', out: 'double_kill.ogg' },
    { wiki: 'leagueoflegends', file: 'Announcer Female1 036.ogg', out: 'triple_kill.ogg' },
    { wiki: 'leagueoflegends', file: 'Announcer Female1 084.ogg', out: 'legendary.ogg' },
    { wiki: 'leagueoflegends', file: 'Announcer Female1 111.ogg', out: 'turret_destroyed.ogg' },
    { wiki: 'leagueoflegends', file: 'Announcer Female1 115.ogg', out: 'welcome.ogg' },
    { wiki: 'mobile-legends', file: 'Announcer.start01.ogg', out: 'welcome_ml.ogg' },
    { wiki: 'mobile-legends', file: 'Announcer.end01.ogg', out: 'victory_ml.ogg' },
    { wiki: 'mobile-legends', file: 'Announcer.object01.ogg', out: 'tower_destroyed_ml.ogg' }
  ];

  for (const item of soundsToFetch) {
    console.log(`Getting URL for ${item.file}...`);
    const fileUrl = await getImageUrl(item.wiki, item.file);
    if (fileUrl) {
      console.log(`Downloading ${item.out} from ${fileUrl}...`);
      const dest = path.join(audioDir, item.out);
      await downloadFile(fileUrl, dest);
      console.log(`Saved ${item.out} (${fs.statSync(dest).size} bytes)`);
    } else {
      console.log(`Could not find URL for ${item.file}`);
    }
  }
}

main().catch(console.error);
