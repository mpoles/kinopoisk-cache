(function () {
    'use strict';

    if (window.kinopoisk_ready) return;
    window.kinopoisk_ready = true;

    // Change this to your actual GitHub Pages URL
    const GITHUB_DATA_URL = 'https://mpoles.github.io/kinopoisk-cache/data.json';

    const network = new Lampa.Reguest();

    /**
     * 1) MAIN MENU
     */
    function main(params, oncomplite, onerror) {
        network.silent(GITHUB_DATA_URL, (json) => {
            const moviesImg = json.movies_cover;
            const seriesImg = json.series_cover;

            const data = {
                results: [
                    {
                        title: "Топ 500 фильмов",
                        img: moviesImg,
                        hpu: "movies"
                    },
                    {
                        title: "Топ 500 сериалов",
                        img: seriesImg,
                        hpu: "series"
                    }
                ],
                total_pages: 1,
                collection: true
            };

            oncomplite(data);
        }, onerror);
    }

    /**
     * 2) COLLECTION
     */
    function full(params, oncomplite, onerror) {
        network.silent(GITHUB_DATA_URL, (json) => {
            let collection = [];

            if (params.url === "movies" || params.url === "top500movies") {
                collection = json.movies || [];
            } else if (params.url === "series" || params.url === "top500series") {
                collection = json.series || [];
            }

            oncomplite({
                results: collection,
                total_pages: 1
            });
        }, onerror);
    }

    function clear() {
        network.clear();
    }

    const Api = { main, full, clear };

    /**
     * 3) MAIN MENU COMPONENT
     */
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
    }

    /**
     * 4) COLLECTION COMPONENT
     *    - No `this.renderItem`, so we create Card objects ourselves.
     */
    function kinopoiskCollectionComponent(object) {
        const comp = new Lampa.InteractionCategory(object);

        comp.create = function () {
            Api.full(object, (data) => {
                this.build(data);
            }, this.empty.bind(this));
        };

        comp.nextPageReuest = function (object, resolve, reject) {
            Api.full(object, resolve.bind(comp), reject.bind(comp));
        };

        /**
         * Build the layout in sections of 50, with top-10 golden rank.
         */
        comp.build = function (data) {
            // Clear anything currently rendered in this component
            comp.empty();

            // We'll gather everything in a single container
            const container = document.createElement('div');
            container.classList.add('kinopoisk-wrapper');

            const items = data.results || [];
            // Tag each item with zero-based rank
            items.forEach((it, idx) => {
                it._rank = idx; // so we know if it's in the top 10
            });

            const total = items.length;
            const chunkSize = 50;

            let startIndex = 0;
            while (startIndex < total) {
                const endIndex = startIndex + chunkSize;
                const chunk = items.slice(startIndex, endIndex);

                // Add a heading for this chunk
                const heading = document.createElement('h2');
                heading.textContent = `${startIndex + 1} - ${Math.min(endIndex, total)}`;
                heading.style.margin = '1.5em 1em 0.5em';
                heading.style.fontSize = '1.4em';
                heading.style.color = '#ffd700';
                container.appendChild(heading);

                // For each item, build a Card and append it
                chunk.forEach((element) => {
                    const cardNode = buildCard(element, object.url);
                    container.appendChild(cardNode);
                });

                startIndex = endIndex;
            }

            // Finally, attach container to the component
            comp.append(container);
        };

        /**
         * Lampa normally calls `cardRender`. We'll replicate that logic
         * by building a Card object ourselves and returning its DOM.
         */
        function buildCard(element, currentUrl) {
            // 1) Create a Lampa Card
            // The constructor signature is: new Lampa.Card(data, options)
            const card = new Lampa.Card(element, { iscollection: true });
            card.create(); // builds the internal DOM

            // 2) If in top 10 => add a golden label
            if (element._rank < 10) {
                const rankLabel = document.createElement('div');
                rankLabel.textContent = (element._rank + 1).toString();
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

                card.render().style.position = 'relative';
                card.render().appendChild(rankLabel);
            }

            // 3) On Enter => open detail
            card.onEnter = () => {
                const isSeries = (currentUrl === 'series' || currentUrl === 'top500series');
                Lampa.Activity.push({
                    component: 'full',
                    id: element.id,
                    method: isSeries ? 'tv' : 'movie',
                    card: element
                });
            };

            // 4) Return the actual DOM node
            return card.render();
        }

        return comp;
    }

    /**
     * 5) INIT PLUGIN: Register components & add menu button
     */
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
