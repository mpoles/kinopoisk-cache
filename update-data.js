const fs = require('fs');
const fetch = require('node-fetch');

const API_KEY = process.env.KINOPOISK_API_KEY;

async function fetchData(url) {
    const response = await fetch(url, {
        headers: {'X-API-KEY': API_KEY}
    });
    return response.json();
}

async function main() {
    const [movies1, movies2, series] = await Promise.all([
        fetchData('https://api.kinopoisk.dev/v1.4/movie?page=1&limit=250&lists=top500'),
        fetchData('https://api.kinopoisk.dev/v1.4/movie?page=2&limit=250&lists=top500'),
        fetchData('https://api.kinopoisk.dev/v1.4/movie?page=1&limit=250&lists=series-top250')
    ]);

    const data = {
        date: new Date().toISOString().split('T')[0],
        movies: processItems([...movies1.docs, ...movies2.docs]),
        series: processItems(series.docs)
    };

    fs.writeFileSync('data.json', JSON.stringify(data));
}

function processItems(items) {
    return items.map(item => ({
        title: item.name,
        year: item.year,
        rating: item.rating?.kp,
        poster: item.poster?.url,
        tmdb_id: item.externalId?.tmdb,
        type: item.type || 'movie'
    })).filter(item => item.tmdb_id);
}

main();
