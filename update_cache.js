/**
 * update_cache.js
 *
 * Run via GitHub Actions to fetch top movies and series from Kinopoisk,
 * produce a single data.json file, and commit to gh-pages.
 */

const fs = require('fs');
const axios = require('axios');

const API_KEY = process.env.KINOPOISK_API_KEY; // from GH Actions secret
if (!API_KEY) {
  console.error('Error: KINOPOISK_API_KEY is not defined in environment');
  process.exit(1);
}

/**
 * Helper to fetch a single page.
 */
async function fetchPage(url) {
  try {
    const resp = await axios.get(url, { headers: { 'X-API-KEY': API_KEY } });
    return resp.data;
  } catch (err) {
    console.error('Error fetching page:', url, err.message);
    return null;
  }
}

/**
 * Fetch multiple pages. Returns combined `docs`.
 */
async function fetchMultiplePages(baseUrl, pages) {
  let allDocs = [];
  for (let page = 1; page <= pages; page++) {
    const pageUrl = baseUrl.replace('PAGE', page);
    const data = await fetchPage(pageUrl);
    if (data && data.docs) {
      allDocs = allDocs.concat(data.docs);
    }
  }
  return allDocs;
}

(async function main(){
  try {
    const moviesBase = `https://api.kinopoisk.dev/v1.4/movie?limit=250&page=PAGE
      &selectFields=externalId&selectFields=name&selectFields=premiere
      &selectFields=rating&selectFields=poster&selectFields=lists
      &notNullFields=externalId.tmdb
      &sortField=rating.kp&sortType=-1
      &lists=top500`.replace(/\s+/g,'');

    const moviesDocs = await fetchMultiplePages(moviesBase, 2);
    const moviesProcessed = moviesDocs.map(item => ({
      id: item.externalId?.tmdb ?? null,
      title: item.name ?? null,
      poster_path: item.poster?.url ?? null,
      release_date: item.premiere?.world ?? null,
      vote_average: item.rating?.kp ?? null
    }));

    const seriesBase = `https://api.kinopoisk.dev/v1.4/movie?limit=250&page=PAGE
      &selectFields=externalId&selectFields=name&selectFields=premiere
      &selectFields=rating&selectFields=poster&selectFields=top250
      &selectFields=votes&selectFields=isSeries
      &notNullFields=externalId.tmdb&notNullFields=name
      &genres.name=!детский&genres.name=!документальный&genres.name=!реальное ТВ
      &votes.kp=9999-9999999
      &sortField=top250&sortField=rating.kp
      &sortType=-1&sortType=-1
      &isSeries=true`.replace(/\s+/g,'');

    const seriesDocs = await fetchMultiplePages(seriesBase, 2);
    let seriesProcessed = seriesDocs.map(item => ({
      id: item.externalId?.tmdb ?? null,
      title: item.name ?? null,
      poster_path: item.poster?.url ?? null,
      release_date: item.premiere?.world ?? null,
      vote_average: item.rating?.kp ?? null,
      media_type: "tv",
      top250: item.top250 ?? 251
    }));
    // Sort series by top250 ascending
    seriesProcessed.sort((a, b) => (a.top250 - b.top250) || 0);

    // Build final JSON
    const today = new Date().toISOString().split('T')[0];
    const finalData = {
      date: today,
      movies: moviesProcessed,
      series: seriesProcessed
    };

    // Write data.json to repository (will be committed by the GH Action step)
    fs.writeFileSync('data.json', JSON.stringify(finalData, null, 2), 'utf-8');
    console.log('data.json updated successfully!');
  }
  catch(e){
    console.error('Error in main function:', e);
    process.exit(1);
  }
})();
