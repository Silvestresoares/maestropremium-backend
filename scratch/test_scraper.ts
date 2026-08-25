import CifraClub from 'cifraclub-wrapper';
import axios from 'axios';
import * as cheerio from 'cheerio';

async function testWrapper() {
  console.log('Searching...');
  const results = await CifraClub.search('Aclame ao Senhor');
  if (!results.length) {
    console.log('No results found.');
    return;
  }
  
  const path = results[0].path;
  const songUrl = `https://www.cifraclub.com.br/${path}/`;
  console.log('Fetching:', songUrl);
  
  try {
    const res = await axios.get(songUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(res.data);
    const pre = $('pre').text();
    const tone = $('#cifra_tom a').text() || $('#cifra_tom').text();
    console.log('Tone:', tone.trim());
    console.log(pre.substring(0, 150));
  } catch (err: any) {
    console.error('Failed', err.message);
  }
}
testWrapper();
