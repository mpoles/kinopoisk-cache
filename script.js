(() => {
    'use strict';

    if (window.kinopoisk_ready) return;
    window.kinopoisk_ready = true;

    const GITHUB_DATA_URL = 'https://mpoles.github.io/kinopoisk-cache/data.json';
    const network = new Lampa.Reguest();

    // Wrap network.silent in a promise for cleaner async handling
    const fetchData = () =>
        new Promise((resolve, reject) => {
            network.silent(GITHUB_DATA_URL, resolve, reject);
        });

    // MAIN MENU: fetch the data and build two collection items
    const main = (params, onComplete, onError) => {
        fetchData()
            .then((json) => {
                const {
                    movies = [],
                    series = [],
                    movies_cover: movies_img,
                    series_cover: series_img
                } = json;

                const data = {
                    results: [
                        { title: "Топ 500 фильмов", img: movies_img, hpu: "movies" },
                        { title: "Топ 500 сериалов", img: series_img, hpu: "series" }
                    ],
                    total_pages: 1,
                    collection: true
                };
                onComplete(data);
            })
            .catch(onError);
    };

    // COLLECTION: fetch full list details from the same data.json
    const full = (params, onComplete, onError) => {
        fetchData()
            .then((json) => {
                const { movies = [], series = [] } = json;
                const collection = ["movies", "top500movies"].includes(params.url)
                    ? movies
                    : ["series", "top500series"].includes(params.url)
                    ? series
                    : [];
                onComplete({ results: collection, total_pages: 1 });
            })
            .catch(onError);
    };

    const clear = () => network.clear();

    const Api = { main, full, clear };

    // Main menu component for the plugin
    const kinopoiskMainComponent = (object) => {
        const comp = new Lampa.InteractionCategory(object);

        comp.create = function () {
            Api.main(object, this.build.bind(this), this.empty.bind(this));
        };

        comp.nextPageReuest = (object, resolve, reject) =>
            Api.main(object, resolve.bind(comp), reject.bind(comp));

        comp.cardRender = function (object, element, card) {
            card.onMenu = false;
            card.onEnter = () => {
                Lampa.Activity.push({
                    url: element.hpu,
                    title: element.title,
                    component: 'kinopoisk_collection',
                    page: 1
                });
            };
        };

        return comp;
    };

    // Collection component with paginated results
    const kinopoiskCollectionComponent = (object) => {
        const comp = new Lampa.InteractionCategory(object);
        const ITEMS_PER_PAGE = 50;

        comp.create = function () {
            Api.full(object, (data) => {
                comp.allResults = data.results;
                comp.total_pages = Math.ceil(comp.allResults.length / ITEMS_PER_PAGE);
                comp.loadPage(1);
            }, comp.empty.bind(comp));
        };

        comp.nextPageReuest = (object, resolve, reject) =>
            comp.loadPage(object.page, resolve, reject);

        // Load a specific page of results
        comp.loadPage = function (page, resolve, reject) {
            const start = (page - 1) * ITEMS_PER_PAGE;
            const pageResults = comp.allResults.slice(start, start + ITEMS_PER_PAGE);

            const data = {
                results: pageResults,
                total_pages: comp.total_pages,
                page
            };

            if (resolve) resolve(data);
            else comp.build(data);
        };

        comp.cardRender = function (object, element, card) {
            card.onMenu = false;
            card.onEnter = () => {
                const isSeries = ["series", "top500series"].includes(object.url);
                Lampa.Activity.push({
                    component: 'full',
                    id: element.id,
                    method: isSeries ? 'tv' : 'movie',
                    card: element
                });
            };

            if (element.rank) {
                const rankBadge = $(`
                    <div style="
                        position: absolute;
                        top: 8px; left: 8px;
                        background: gold; color: black;
                        font-weight: bold; border-radius: 8px;
                        padding: 2px 6px; font-size: 1.4em;
                        box-shadow: 0 0 8px rgba(0,0,0,0.3);
                        z-index: 2;">
                        ${element.rank}
                    </div>
                `);
                card.render().append(rankBadge);
            }
        };

        return comp;
    };

    // Plugin initialization and menu button registration
    const initPlugin = () => {
        const manifest = {
            type: 'video',
            version: '1.0.0',
            name: 'Кинопоиск',
            description: 'Топ 500 фильмов и сериалов с Кинопоиска',
            component: 'kinopoisk_main'
        };

        Lampa.Component.add('kinopoisk_main', kinopoiskMainComponent);
        Lampa.Component.add('kinopoisk_collection', kinopoiskCollectionComponent);

        // Add the plugin button to the menu
        const addMenuButton = () => {
            const button = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="-110 -110 220 220" width="64" height="64">
                            <path fill="rgb(255,255,255)" d="M110,-108.5C110,-108.5-52.109,-22.912-52.109,-22.912C-52.109,-22.912,32.371,-108.5,32.371,-108.5C32.371,-108.5,-14.457,-108.5,-14.457,-108.5C-14.457,-108.5,-71.971,-29.757,-71.971,-29.757C-71.971,-29.757,-71.971,-108.5,-71.971,-108.5C-71.971,-108.5,-110,-108.5,-110,-108.5C-110,-108.5,-110,108.5,-110,108.5C-110,108.5,-71.971,108.5,-71.971,108.5C-71.971,108.5,-71.971,29.884,-71.971,29.884C-71.971,29.884,-14.457,108.5,-14.457,108.5C-14.457,108.5,32.371,108.5,32.371,108.5C32.371,108.5,-49.915,25.603,-49.915,25.603C-49.915,25.603,110,108.5,110,108.5C110,108.5,110,68.2,110,68.2C110,68.2,-35.854,10.484,-35.854,10.484C-35.854,10.484,110,20.15,110,20.15C110,20.15,110,-20.15,110,-20.15C110,-20.15,-34.93,-10.856,-34.93,-10.856C-34.93,-10.856,110,-68.2,110,-68.2C110,-68.2,110,-108.5,110,-108.5Z"/>
                        </svg>
                    </div>
                    <div class="menu__text">${manifest.name}</div>
                </li>
            `);

            button.on('hover:enter', () => {
                Lampa.Activity.push({
                    url: '',
                    title: manifest.name,
                    component: 'kinopoisk_main',
                    page: 1
                });
            });

            $('.menu .menu__list').eq(0).append(button);
        };

        if (window.appready) addMenuButton();
        else Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready') addMenuButton();
        });
    };

    // Start the plugin
    initPlugin();
})();
