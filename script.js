(function () { 
    'use strict';

    if (window.kinopoisk_ready) return;
    window.kinopoisk_ready = true;

    // Change this to your actual GitHub Pages URL
    const GITHUB_DATA_URL = 'https://mpoles.github.io/kinopoisk-cache/data.json';

    const network = new Lampa.Reguest();

    // MAIN MENU: fetch the data and build two collection items
    function main(params, oncomplite, onerror) {
        network.silent(GITHUB_DATA_URL, (json) => {
            let movies_img = json.movies_cover;
            let series_img = json.series_cover;

            const data = {
                results: [
                    {
                        title: "Топ 500 фильмов",
                        img: movies_img,
                        hpu: "movies" // identifier for the collection
                    },
                    {
                        title: "Топ 500 сериалов",
                        img: series_img,
                        hpu: "series"
                    }
                ],
                total_pages: 1,
                collection: true
            };

            oncomplite(data);
        }, (e) => {
            onerror(e);
        });
    }

    // COLLECTION: fetch full list details from the same data.json
    function full(params, oncomplite, onerror) {
        network.silent(GITHUB_DATA_URL, (json) => {
            let collection = [];
            if (params.url === "movies" || params.url === "top500movies"){
                collection = json.movies || [];
            }
            else if (params.url === "series" || params.url === "top500series"){
                collection = json.series || [];
            }

            // Assign a rank number to each item (starting at 1)
            collection = collection.map((item, index) => {
                item.rank = index + 1;
                return item;
            });

            // Create a new grouped array with section headers for every 50 items.
            let grouped = [];
            for(let i = 0; i < collection.length; i++){
                // Insert a header at the start of each section
                if(i % 50 === 0){
                    let start = i + 1;
                    let end = Math.min(i + 50, collection.length);
                    grouped.push({ header: true, title: `${start}-${end}` });
                }
                grouped.push(collection[i]);
            }

            const data = {
                results: grouped,
                total_pages: 1
            };

            oncomplite(data);
        }, (e) => {
            onerror(e);
        });
    }

    function clear() {
        network.clear();
    }

    const Api = { main, full, clear };

    // Main menu component for the plugin
    function kinopoiskMainComponent(object) {
        const comp = new Lampa.InteractionCategory(object);

        comp.create = function () {
            Api.main(object, this.build.bind(this), this.empty.bind(this));
        };

        comp.nextPageReuest = function (object, resolve, reject) {
            Api.main(object, resolve.bind(comp), reject.bind(comp));
        };

        comp.cardRender = function (object, element, card) {
            card.onMenu = false;
            card.onEnter = function () {
                Lampa.Activity.push({
                    url: element.hpu,
                    title: element.title,
                    component: 'kinopoisk_collection',
                    page: 1
                });
            };
        };

        return comp;
    }

function kinopoiskCollectionComponent(object) {
    const comp = new Lampa.InteractionCategory(object);

    comp.create = function () {
        Api.full(object, (data) => {
            const results = data.results || [];

            // Split the array into sections of 50 items each
            const sections = [];
            for (let i = 0; i < results.length; i += 50) {
                sections.push({
                    title: `${i + 1} – ${Math.min(i + 50, results.length)}`,
                    items: results.slice(i, i + 50)
                });
            }

            // Build final data array with section titles as text headers
            const finalResults = [];

            sections.forEach(section => {
                // Section header as a simple text element (non-card)
                finalResults.push({
                    title: section.title,
                    type: 'title' // Custom type to identify headers
                });

                // Movies/series with optional golden 位 number for top 10
                section.items.forEach((item, index) => {
                    const globalIndex = finalResults.filter(i => i.type !== 'title').length + 1; // global position (1-500)
                    finalResults.push({
                        ...item,
                        type: 'item',
                        position: globalIndex
                    });
                });
            });

            this.build({ results: finalResults });
        }, this.empty.bind(this));
    };

    comp.nextPageReuest = function (object, resolve, reject) {
        resolve({ results: [] });
    };

    comp.cardRender = function (object, element, card) {
        if (element.type === 'title') {
            // Render simple title without card styling
            card.empty();
            card.append(`<div style="width:100%; text-align:left; font-size:1.4em; padding:1rem 0; opacity:0.8; color:#fff;">${element.title}</div>`);
            card.addClass('no-hover');
            card.onEnter = function() {}; // Disable click for titles
        } else {
            card.onMenu = false;

            // Golden stylish 位 number for top 10
            if (element.position <= 10) {
                const goldenNumber = $(`
                    <div style="
                        position:absolute;
                        top:8px;
                        left:8px;
                        width:36px;
                        height:36px;
                        background:#DAA520;
                        color:#fff;
                        font-size:22px;
                        font-weight:bold;
                        text-align:center;
                        line-height:36px;
                        border-radius:50%;
                        box-shadow:0 0 8px rgba(0,0,0,0.3);
                        z-index:5;
                    ">${element.position}</div>
                `);
                card.append(goldenNumber);
            }

            card.onEnter = function () {
                const isSeries = (object.url === 'series' || object.url === 'top500series');

                Lampa.Activity.push({
                    component: 'full',
                    id: element.id,
                    method: isSeries ? 'tv' : 'movie',
                    card: element
                });
            };
        }
    };

    return comp;
}



    // Plugin initialization and menu button registration
    function initPlugin() {
        const manifest = {
            type: 'video',
            version: '1.0.0',
            name: 'Кинопоиск',
            description: 'Топ 500 фильмов и сериалов с Кинопоиска',
            component: 'kinopoisk_main'
        };

        Lampa.Component.add('kinopoisk_main', kinopoiskMainComponent);
        Lampa.Component.add('kinopoisk_collection', kinopoiskCollectionComponent);

        // Add the plugin button to the menu.
        function addMenuButton() {
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
        }

        if (window.appready) addMenuButton();
        else {
            Lampa.Listener.follow('app', (e) => {
                if (e.type === 'ready') addMenuButton();
            });
        }
    }

    // Start the plugin
    initPlugin();
})();
