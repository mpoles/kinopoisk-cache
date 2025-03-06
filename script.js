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

        /**
         * Overriding create(): fetch data, then build with our custom grouping logic.
         */
        comp.create = function () {
            Api.full(object, (data) => {
                this.buildSections(data); // custom grouping
            }, this.empty.bind(this));
        };

        /**
         * Instead of comp.build(data), we define our own "buildSections".
         * This groups the list in chunks of 50, and for each chunk:
         *   - adds an <h2> label (not navigable)
         *   - appends the 50 items as standard Lampa cards
         */
        comp.buildSections = function (data) {
            // store the data so that Lampa can reference it if needed
            this.data = data;

            let results = data.results || [];

            // Add a __rank property to each item so we know which are top 10
            results.forEach((item, i) => {
                item.__rank = i + 1; // 1-based index
            });

            // The main container in which we'll place headings + cards
            const container = $('<div></div>');

            // We'll chunk by 50
            const chunkSize = 50;
            let total = results.length;

            for (let start = 0; start < total; start += chunkSize) {
                let end = Math.min(start + chunkSize, total);
                let headingText = (start + 1) + '-' + end;

                // Insert an <h2> heading for this chunk
                let heading = $(`<h2 class="collection-section-heading">${headingText}</h2>`);
                container.append(heading);

                // Slice out the subset of items for this chunk
                let subset = results.slice(start, end);

                // Render each item as a standard Lampa card
                subset.forEach(element => {
                    let card = Lampa.Template.get('card', {}, true);

                    // "cardRender" is your standard logic that sets up how cards behave
                    this.cardRender(object, element, card);

                    // Write the item title into the card's .card__title
                    card.find('.card__title').text(element.title);

                    // If this item is in top 10, prepend a fancy golden rank label
                    if (element.__rank <= 10) {
                        let goldBadge = $(`<div class="golden-rank">#${element.__rank}</div>`);
                        // We can place it in the .card__view or near the title
                        card.find('.card__view').prepend(goldBadge);
                    }

                    container.append(card);
                });
            }

            // Append everything to the main component HTML
            this.html.append(container);
            
            // Hide loader
            this.activity.loader(false);

            // Bind standard Lampa events
            this.bind(this.html);
        };

        /**
         * We'll leave nextPageReuest alone, since we aren't doing multiple pages in Lampa terms.
         */
        comp.nextPageReuest = function (object, resolve, reject) {
            Api.full(object, resolve.bind(comp), reject.bind(comp));
        };

        /**
         * Overriding cardRender so we can push correct item details for Lampa's "full" activity.
         */
        comp.cardRender = function (object, element, card) {
            card.onMenu = false;

            card.onEnter = () => {
                const isSeries = (object.url === 'series' || object.url === 'top500series');
                Lampa.Activity.push({
                    component: 'full',
                    id: element.id,
                    method: isSeries ? 'tv' : 'movie',
                    card: element
                });
            };
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
