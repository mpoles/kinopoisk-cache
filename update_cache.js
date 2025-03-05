/**
 * update_cache.js
 *
 * Run via GitHub Actions to fetch top movies and series from Kinopoisk,
 * produce a single data.json file, and commit to gh-pages.
 */

const fs = require('fs');
const axios = require('axios');

const KINOPOISK_API_KEY = process.env.KINOPOISK_API_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!KINOPOISK_API_KEY) {
  process.exit(1);
}
if (!TMDB_API_KEY) {
  process.exit(2);
}

async function fetchPage(url) {
  try {
    const resp = await axios.get(url, { headers: { 'X-API-KEY': KINOPOISK_API_KEY } });
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

async function fetchTmdbPosterPath(tmdbId, isMovie) {
  if (!tmdbId) return null;

  const type = isMovie ? 'movie' : 'tv';
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/images?include_image_language=ru`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${TMDB_API_KEY}` }
    });
    const data = response.data;
    if (!data || !data.posters || !data.posters.length) return null;

    // Prefer RU-language poster, else fallback to first poster
    let ruPoster = data.posters.find(p => p.iso_639_1 === 'ru');
    if (!ruPoster) ruPoster = data.posters[0];

    // Return the raw file_path, or prepend an image URL if desired
    // e.g. "https://image.tmdb.org/t/p/original" + ruPoster.file_path
    return ruPoster.file_path;
  } catch (err) {
    console.error(`Error fetching TMDB poster for ID ${tmdbId}`, err.message);
    return null;
  }
}
async function enrichWithTmdbPosters(items, isMovie) {
  // We do this sequentially to avoid flooding the API with concurrent calls.
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const tmdbPosterPath = await fetchTmdbPosterPath(item.id, isMovie);
    if (tmdbPosterPath) {
      // Optionally prefix with an image path from TMDB, e.g. "https://image.tmdb.org/t/p/w500"
      // or "https://image.tmdb.org/t/p/original"
      item.poster_path = tmdbPosterPath;
    }
  }
}

(async function main(){
  try {
    const moviesBase = `https://api.kinopoisk.dev/v1.4/movie?limit=250&page=PAGE
      &selectFields=externalId&selectFields=name&selectFields=premiere
      &selectFields=rating&selectFields=lists
      &notNullFields=externalId.tmdb
      &sortField=rating.kp&sortType=-1
      &lists=top500`.replace(/\s+/g,'');

    const moviesDocs = await fetchMultiplePages(moviesBase, 2);
    const moviesProcessed = moviesDocs.map(item => ({
      id: item.externalId?.tmdb ?? null,
      title: item.name ?? null,
      release_date: item.premiere?.world ?? null,
      vote_average: item.rating?.kp ?? null
    }));

    const seriesBase = `https://api.kinopoisk.dev/v1.4/movie?limit=250&page=PAGE
      &selectFields=externalId&selectFields=name&selectFields=premiere
      &selectFields=rating&selectFields=top250
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
      first_air_date: item.premiere?.world ?? null,
      vote_average: item.rating?.kp ?? null,
      top250: item.top250 ?? 251
    }));
    // Sort series by top250 ascending
    seriesProcessed.sort((a, b) => (a.top250 - b.top250) || 0);

    await enrichWithTmdbPosters(moviesProcessed, true);
    await enrichWithTmdbPosters(seriesProcessed, false);

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
