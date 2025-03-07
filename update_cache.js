const fs = require('fs');
const axios = require('axios');

const { KINOPOISK_API_KEY, TMDB_API_KEY } = process.env;
if (!KINOPOISK_API_KEY || !TMDB_API_KEY) process.exit(1);

const kinopoiskAxios = axios.create({
  headers: { 'X-API-KEY': KINOPOISK_API_KEY }
});

const tmdbAxios = axios.create({
  headers: { Authorization: `Bearer ${TMDB_API_KEY}` }
});

const fetchPage = async (url) => {
  try {
    const { data } = await kinopoiskAxios.get(url);
    return data;
  } catch (error) {
    console.error('Error fetching page:', url, error.message);
    return null;
  }
};

const fetchMultiplePages = async (baseUrl, pages) => {
  const pagePromises = Array.from({ length: pages }, (_, i) => {
    const pageUrl = baseUrl.replace('PAGE', i + 1);
    return fetchPage(pageUrl);
  });
  const results = await Promise.all(pagePromises);
  return results.reduce((acc, result) => {
    if (result?.docs) acc.push(...result.docs);
    return acc;
  }, []);
};

const fetchCollectionCover = async (slug) => {
  const url = `https://api.kinopoisk.dev/v1.4/list?page=1&limit=1&selectFields=cover&slug=${slug}`;
  const data = await fetchPage(url);
  return data?.docs?.[0]?.cover?.url || null;
};

const fetchTmdbPosterPath = async (tmdbId, isMovie) => {
  if (!tmdbId) return null;
  const type = isMovie ? 'movie' : 'tv';
  let url = `https://api.themoviedb.org/3/${type}/${tmdbId}/images?include_image_language=ru`;
  try {
    let { data: { posters } } = await tmdbAxios.get(url);
    if (!posters.length) {
      url = `https://api.themoviedb.org/3/${type}/${tmdbId}/images`;
      ({ data: { posters } } = await tmdbAxios.get(url));
    }
    return posters.length ? posters[0].file_path : null;
  } catch (error) {
    console.error(`Error fetching TMDB poster for ID ${tmdbId}`, error.message);
    return null;
  }
};

// Simple concurrency limiter function
const pLimit = (concurrency) => {
  let active = 0;
  const queue = [];
  const next = () => {
    active--;
    if (queue.length > 0) {
      queue.shift()();
    }
  };
  return (fn) => new Promise((resolve, reject) => {
    const run = async () => {
      active++;
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        next();
      }
    };
    if (active < concurrency) {
      run();
    } else {
      queue.push(run);
    }
  });
};

const limit = pLimit(5); // Adjust the concurrency as needed

const enrichWithTmdbPosters = async (items, isMovie) => {
  await Promise.all(items.map(item => limit(async () => {
    if (!item.poster_path) {
      const poster = await fetchTmdbPosterPath(item.id, isMovie);
      if (poster) item.poster_path = poster;
    }
  })));
};

const fetchTmdbDataForMissingIds = async (title) => {
  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}`;
  try {
    const { data } = await tmdbAxios.get(url);
    const [result] = data.results;
    return result ? { id: result.id, poster_path: result.poster_path } : { id: null, poster_path: null };
  } catch (error) {
    console.error(`Error searching TMDB for movie: ${title}`, error.message);
    return { id: null, poster_path: null };
  }
};

(async function main() {
  try {
    const moviesBase = `https://api.kinopoisk.dev/v1.4/movie?limit=250&page=PAGE&selectFields=externalId&selectFields=name&selectFields=year&selectFields=rating&selectFields=lists&sortField=rating.kp&sortType=-1&lists=top500`;
    const moviesDocs = await fetchMultiplePages(moviesBase, 2);
    
    const moviesProcessed = await Promise.all(
      moviesDocs.map(async (item, index) => {
        let { tmdb: id = null } = item.externalId || {};
        let poster_path = null;
        if (!id) {
          const tmdbData = await fetchTmdbDataForMissingIds(item.name);
          id = tmdbData.id;
          poster_path = tmdbData.poster_path;
        }
        return {
          rank: index + 1,
          id,
          title: item.name || null,
          release_date: year || '',
          vote_average: item.rating?.kp || null,
          poster_path
        };
      })
    );
    
    const seriesBase = `https://api.kinopoisk.dev/v1.4/movie?limit=250&page=PAGE&selectFields=externalId&selectFields=name&selectFields=year&selectFields=rating&selectFields=top250&selectFields=votes&selectFields=isSeries&notNullFields=externalId.tmdb&seriesLength=!1&seriesLength=!2&seriesLength=!3&seriesLength=!4&seriesLength=!5&seriesLength=!6&seriesLength=!7&seriesLength=!8&seriesLength=!9&seriesLength=!10&seriesLength=!11&seriesLength=!12&seriesLength=!13&seriesLength=!14&genres.name=!детский&genres.name=!документальный&genres.name=!реальное ТВ&genres.name=!ток-шоу&genres.name=!игра&votes.kp=9999-9999999&sortField=top250&sortField=rating.kp&sortType=-1&sortType=-1&isSeries=true`;
    const seriesDocs = await fetchMultiplePages(seriesBase, 2);
    
    seriesDocs.sort((a, b) => (a.top250 ?? 251) - (b.top250 ?? 251));
    
    const seriesProcessed = seriesDocs.map((item, index) => ({
      rank: index + 1,
      id: item.externalId?.tmdb || null,
      title: item.name || null,
      first_air_date: year || '',
      vote_average: item.rating?.kp || null
    }));
    
    await Promise.all([
      enrichWithTmdbPosters(moviesProcessed, true),
      enrichWithTmdbPosters(seriesProcessed, false)
    ]);
    
    const [moviesCoverUrl, seriesCoverUrl] = await Promise.all([
      fetchCollectionCover('popular-films'),
      fetchCollectionCover('popular-series')
    ]);
    
    const today = new Date().toISOString().split('T')[0];
    const finalData = {
      date: today,
      movies: moviesProcessed,
      series: seriesProcessed,
      movies_cover: moviesCoverUrl,
      series_cover: seriesCoverUrl
    };
    
    fs.writeFileSync('data.json', JSON.stringify(finalData, null, 2), 'utf-8');
    console.log('data.json updated successfully with ranks!');
  } catch (err) {
    console.error('Error in main function:', err);
    process.exit(1);
  }
})();
