const https = require('https');
const fs = require('fs');
const path = require('path');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let nextUrl = res.headers.location;
        if (!nextUrl.startsWith('http')) nextUrl = 'https://www.101soundboards.com' + nextUrl;
        return resolve(fetchUrl(nextUrl));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching soundboard...');
  const res = await fetchUrl('https://www.101soundboards.com/boards/10777-arena-of-valor-sounds');
  console.log('Status:', res.status, 'Body len:', res.body.length);
  
  // Extract sound items
  const matches = res.body.match(/data-sound-url=\"([^\"]+)\"/g) || [];
  console.log('Sound urls count:', matches.length);
  console.log('Sample:', matches.slice(0, 10));

  const trackMatches = res.body.match(/<a class=\"playable_link\"[^>]*title=\"([^\"]+)\"[^>]*href=\"([^\"]+)\"/g) || [];
  console.log('Track links count:', trackMatches.length);
  console.log('Sample tracks:', trackMatches.slice(0, 10));

  fs.writeFileSync(path.join(__dirname, 'soundboard.html'), res.body);
}

main().catch(console.error);
