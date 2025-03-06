const fs = require('fs');
const axios = require('axios');

const KINOPOISK_API_KEY = process.env.KINOPOISK_API_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!KINOPOISK_API_KEY) process.exit(1);
if (!TMDB_API_KEY) process.exit(2);

async function fetchPage(url) {
  try {
    const resp = await axios.get(url, { headers: { 'X-API-KEY': KINOPOISK_API_KEY } });
    return resp.data;
  } catch (err) {
    console.error('Error fetching page:', url, err.message);
    return null;
  }
}

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

async function fetchCollectionCover(slug) {
  const url = `https://api.kinopoisk.dev/v1.4/list?page=1&limit=1&selectFields=cover&slug=${slug}`;
  const data = await fetchPage(url);
  if (data && data.docs && data.docs.length) {
    return data.docs[0].cover?.url || null;
  }
  return null;
}

async function fetchTmdbPosterPath(tmdbId, isMovie) {
  if (!tmdbId) return null;

  const type = isMovie ? 'movie' : 'tv';
  let url = `https://api.themoviedb.org/3/${type}/${tmdbId}/images?include_image_language=ru`;

  try {
    let response = await axios.get(url, { headers: { Authorization: `Bearer ${TMDB_API_KEY}` } });
    let posters = response.data.posters;

    if (!posters.length) {
      url = `https://api.themoviedb.org/3/${type}/${tmdbId}/images`;
      const fallbackResponse = await axios.get(url, { headers: { Authorization: `Bearer ${TMDB_API_KEY}` }});
      posters = fallbackResponse.data.posters;
    }

    if (!posters.length) return null;

    return posters[0].file_path;
  } catch (err) {
    console.error(`Error fetching TMDB poster for ID ${tmdbId}`, err.message);
    return null;
  }
}

async function enrichWithTmdbPosters(items, isMovie) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.poster_path) {
      const tmdbPosterPath = await fetchTmdbPosterPath(item.id, isMovie);
      if (tmdbPosterPath) item.poster_path = tmdbPosterPath;
    }
  }
}

async function fetchTmdbDataForMissingIds(title) {
  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}`;
  try {
    const response = await axios.get(url, { headers: { Authorization: `Bearer ${TMDB_API_KEY}` } });
    if (response.data.results.length) {
      const result = response.data.results[0];
      return { id: result.id, poster_path: result.poster_path };
    }
  } catch (err) {
    console.error(`Error searching TMDB for movie: ${title}`, err.message);
  }
  return { id: null, poster_path: null };
}

(async function main() {
  try {
    const moviesBase = `https://api.kinopoisk.dev/v1.4/movie?limit=250&page=PAGE&selectFields=externalId&selectFields=name&selectFields=premiere&selectFields=rating&selectFields=lists&sortField=rating.kp&sortType=-1&lists=top500`;

    const moviesDocs = await fetchMultiplePages(moviesBase, 2);

const moviesProcessed = await Promise.all(
  moviesDocs.map(async (item, index) => {
    let id = item.externalId?.tmdb ?? null;
    let poster_path = null;

    if (!id) {
      const tmdbData = await fetchTmdbDataForMissingIds(item.name);
      id = tmdbData?.id ?? null;
      poster_path = tmdbData?.poster_path ?? null;
    }

    return {
      rank: index + 1,
      id,
      title: item.name ?? null,
      release_date: item.premiere?.world?.slice(0,10) ?? item.premiere?.russia?.slice(0,10) ?? '',
      vote_average: item.rating?.kp ?? null,
      poster_path
    };
  })
);

    const seriesBase = `https://api.kinopoisk.dev/v1.4/movie?limit=250&page=PAGE&selectFields=externalId&selectFields=name&selectFields=premiere&selectFields=rating&selectFields=top250&selectFields=votes&selectFields=isSeries&notNullFields=externalId.tmdb&seriesLength=!1&seriesLength=!2&seriesLength=!3&seriesLength=!4&seriesLength=!5&seriesLength=!6&seriesLength=!7&seriesLength=!8&seriesLength=!9&seriesLength=!10&seriesLength=!11&seriesLength=!12&seriesLength=!13&seriesLength=!14&genres.name=!детский&genres.name=!документальный&genres.name=!реальное ТВ&genres.name=!ток-шоу&genres.name=!игра&votes.kp=9999-9999999&sortField=top250&sortField=rating.kp&sortType=-1&sortType=-1&isSeries=true`;

    const seriesDocs = await fetchMultiplePages(seriesBase, 2);

    seriesDocs.sort((a, b) => (a.top250 ?? 251) - (b.top250 ?? 251));

    const seriesProcessed = seriesDocs.map((item, index) => ({
      rank: index + 1,
      id: item.externalId?.tmdb ?? null,
      title: item.name ?? null,
      first_air_date: item.premiere?.world?.slice(0,10) ?? item.premiere?.russia?.slice(0,10) ?? '',
      vote_average: item.rating?.kp ?? null
    }));

    await enrichWithTmdbPosters(moviesProcessed, true);
    await enrichWithTmdbPosters(seriesProcessed, false);

    const moviesCoverUrl = await fetchCollectionCover('popular-films');
    const seriesCoverUrl = await fetchCollectionCover('popular-series');

    const today = new Date().toISOString().split('T')[0];
    const finalData = { date: today, movies: moviesProcessed, series: seriesProcessed, movies_cover: moviesCoverUrl, series_cover: seriesCoverUrl };

    fs.writeFileSync('data.json', JSON.stringify(finalData, null, 2), 'utf-8');
    console.log('data.json updated successfully with ranks!');
  } catch (e) {
    console.error('Error in main function:', e);
    process.exit(1);
  }
})();
