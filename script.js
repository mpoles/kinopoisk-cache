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
            let movies = json.movies || [];
            let series = json.series || [];

            // Use first item poster as collection image if available, else fallback
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
            let movies = json.movies || [];
            let series = json.series || [];
            let collection = [];

            if (params.url === "movies" || params.url === "top500movies"){
                collection = movies;
            }
            else if (params.url === "series" || params.url === "top500series"){
                collection = series;
            }

            const data = {
                results: collection,
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

    // Collection component for movies or series list
function kinopoiskCollectionComponent(object) {
    const comp = new Lampa.InteractionCategory(object);

    comp.create = function () {
        Api.full(object, this.build.bind(this), this.empty.bind(this));
    };

    comp.nextPageReuest = function (object, resolve, reject) {
        Api.full(object, resolve.bind(comp), reject.bind(comp));
    };

    comp.build = function (data) {
        const modified_results = [];
        const original_results = data.results;

        // Add stylish golden 位 digit for top 10
        original_results.forEach((item, index) => {
            const card = Object.assign({}, item);
            card.title = index < 10
                ? `✨<span style="color:#FFD700; font-weight:bold;">${index + 1}</span> ${item.title}`
                : `${index + 1}. ${item.title}`;

            modified_results.push(card);
        });

        // Divide into sections of 50 each
        const sectionSize = 50;
        const results_with_sections = [];

        for (let i = 0; i < modified_results.length; i += sectionSize) {
            const start = i + 1;
            const end = Math.min(i + sectionSize, modified_results.length);

            // Add non-clickable heading
            results_with_sections.push({
                title: `<div style="width:100%;padding:15px 0;font-size:1.8em;color:white;text-align:left;">${start}–${end}</div>`,
                nonclickable: true
            });

            // Add actual items
            results_with_sections.push(...modified_results.slice(i, i + sectionSize));
        }

        // Finally call the original build with modified data
        data.results = results_with_sections;
        Lampa.InteractionCategory.prototype.build.call(this, data);
    };

    comp.cardRender = function (object, element, card) {
        card.onMenu = false;

        // Make sure non-clickable sections can't be clicked
        if (element.nonclickable) {
            card.addClass('card--section-header');
            card.onEnter = function () {}; // Do nothing on click
            card.visible = function () {}; // Do nothing special
            card.render().find('.card__img, .card__view, .card__title').remove(); // remove images
            card.render().append($(element.title)); // set styled text directly
        } else {
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

        // Add the plugin button to the menu
        function addMenuButton() {
            const button = $(
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="-110 -110 220 220" width="64" height="64">
  <path fill="rgb(255,255,255)" d="M110,-108.5C110,-108.5-52.109,-22.912-52.109,-22.912C-52.109,-22.912,32.371,-108.5,32.371,-108.5C32.371,-108.5,-14.457,-108.5,-14.457,-108.5C-14.457,-108.5,-71.971,-29.757,-71.971,-29.757C-71.971,-29.757,-71.971,-108.5,-71.971,-108.5C-71.971,-108.5,-110,-108.5,-110,-108.5C-110,-108.5,-110,108.5,-110,108.5C-110,108.5,-71.971,108.5,-71.971,108.5C-71.971,108.5,-71.971,29.884,-71.971,29.884C-71.971,29.884,-14.457,108.5,-14.457,108.5C-14.457,108.5,32.371,108.5,32.371,108.5C32.371,108.5,-49.915,25.603,-49.915,25.603C-49.915,25.603,110,108.5,110,108.5C110,108.5,110,68.2,110,68.2C110,68.2,-35.854,10.484,-35.854,10.484C-35.854,10.484,110,20.15,110,20.15C110,20.15,110,-20.15,110,-20.15C110,-20.15,-34.93,-10.856,-34.93,-10.856C-34.93,-10.856,110,-68.2,110,-68.2C110,-68.2,110,-108.5,110,-108.5Z"/>
</svg>
                    </div>
                    <div class="menu__text">${manifest.name}</div>
                </li>
            );

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
