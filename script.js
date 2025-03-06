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

            // Use cover images from the data if available
            let movies_img = json.movies_cover;
            let series_img = json.series_cover;

            const data = {
                results: [
                    {
                        title: "Топ 500 фильмов",
                        img: movies_img,
                        hpu: "movies"
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

        // Overriding create
        comp.create = function () {
            Api.full(object, (data) => {
                this.build(data);
            }, this.empty.bind(this));
        };

        comp.nextPageReuest = function (object, resolve, reject) {
            Api.full(object, resolve.bind(comp), reject.bind(comp));
        };

        /**
         * Overriding build to chunk items into sections of 50
         * and render top-10 golden rank.
         */
        comp.build = function (data) {
            // Save data so Lampa can handle some internal details if needed
            this.saveData(data);
            this.clear();
            this.loading(false);

            let items = data.results || [];
            let chunkSize = 50;
            let total = items.length;

            // For sorting or for top-10, we assume items are already in the order you want.
            // We'll attach a "_rank" property so we know their absolute position.
            for (let i = 0; i < total; i++) {
                items[i]._rank = i; // zero-based index
            }

            // Now chunk them into sets of 50
            let startIndex = 0;
            let sectionNumber = 1;
            while (startIndex < total) {
                let endIndex = startIndex + chunkSize;
                let chunk = items.slice(startIndex, endIndex);

                // Add an <h2> for this chunk
                let heading = document.createElement('h2');
                heading.textContent = `${startIndex + 1} - ${Math.min(endIndex, total)}`;
                heading.style.margin = '1.5em 0 0.5em 1.5em';
                heading.style.fontSize = '1.4em';
                heading.style.color = '#ffd700'; // gold color if you like
                this.body.append(heading);

                // Render each item in the chunk
                chunk.forEach((element) => {
                    // use Lampa's built-in "renderItem()" => calls `cardRender`
                    let card = this.renderItem(element);
                    this.body.append(card);
                });

                startIndex = endIndex;
                sectionNumber++;
            }

            // Force a DOM update for Lampa to arrange items
            this.append(this.body);

            // Let Lampa know we are done
            this.loading(false);
        };

        /**
         * Enhanced cardRender: if item is in top 10 => add golden rank digit
         */
        comp.cardRender = function (object, element, card) {
            card.onMenu = false;

            // If it's top 10, show golden rank
            if (element._rank < 10) {
                const rankLabel = document.createElement('div');
                rankLabel.textContent = element._rank + 1; // 1-based index
                rankLabel.style.position = 'absolute';
                rankLabel.style.top = '0';
                rankLabel.style.left = '0';
                rankLabel.style.backgroundColor = 'gold';
                rankLabel.style.color = 'black';
                rankLabel.style.padding = '0.2em 0.4em';
                rankLabel.style.fontWeight = 'bold';
                rankLabel.style.fontSize = '1.2em';
                rankLabel.style.borderRadius = '0 0.5em 0.5em 0';
                rankLabel.style.zIndex = '10';

                // "card.render()" usually returns the DOM element of the card
                card.render().style.position = 'relative';
                card.render().appendChild(rankLabel);
            }

            // onEnter for opening the selected item
            card.onEnter = function () {
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
