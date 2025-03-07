(function() {
  'use strict';

  // Prevent re-initialization
  if (window.kinopoisk_ready) return;
  window.kinopoisk_ready = true;

  // Change this to your actual GitHub Pages URL
  const GITHUB_DATA_URL = 'https://mpoles.github.io/kinopoisk-cache/data.json';
  const network = new Lampa.Reguest();

  /**
   * Cache for storing the data.json response so we only fetch once.
   * Improves performance if main() and full() are called multiple times.
   */
  let cachedData = null;

  /**
   * Fetch JSON data from GITHUB_DATA_URL (or return cached data if available).
   * @returns {Promise<Object>} A promise resolving to the fetched (or cached) JSON.
   */
  function fetchData() {
    return new Promise((resolve, reject) => {
      // Use cached data if available
      if (cachedData) {
        resolve(cachedData);
        return;
      }
      // Otherwise, fetch from the network
      network.silent(
        GITHUB_DATA_URL,
        (json) => {
          cachedData = json;
          resolve(json);
        },
        (error) => reject(error)
      );
    });
  }

  /**
   * Build main menu data: two "collections" – one for movies and one for series.
   * @param {Object}   params       - Lampa’s params object
   * @param {Function} oncomplite   - Callback for success
   * @param {Function} onerror      - Callback for error
   */
  const main = (params, oncomplite, onerror) => {
    fetchData()
      .then((json) => {
        const { movies_cover, series_cover } = json || {};

        const data = {
          results: [
            {
              title: 'Топ 500 фильмов',
              img: movies_cover,
              hpu: 'movies' // identifier for the collection
            },
            {
              title: 'Топ 500 сериалов',
              img: series_cover,
              hpu: 'series'
            }
          ],
          total_pages: 1,
          collection: true
        };
        oncomplite(data);
      })
      .catch(onerror);
  };

  /**
   * Build a "full" list (movies or series) based on URL params.
   * @param {Object}   params       - Lampa’s params object
   * @param {Function} oncomplite   - Callback for success
   * @param {Function} onerror      - Callback for error
   */
  const full = (params, oncomplite, onerror) => {
    fetchData()
      .then((json) => {
        const { movies = [], series = [] } = json || {};
        let collection = [];

        // Determine which collection to load
        const isMovies =
          params.url === 'movies' || params.url === 'top500movies';
        const isSeries =
          params.url === 'series' || params.url === 'top500series';

        if (isMovies) collection = movies;
        else if (isSeries) collection = series;

        const data = {
          results: collection,
          total_pages: 1
        };
        oncomplite(data);
      })
      .catch(onerror);
  };

  /**
   * Clear pending requests. We keep the JSON cached to avoid unnecessary re-fetching.
   */
  function clear() {
    network.clear();
  }

  const Api = { main, full, clear };

  /**
   * Main menu component for the plugin. Shows "Топ 500 фильмов" and "Топ 500 сериалов".
   */
  function kinopoiskMainComponent(object) {
    const comp = new Lampa.InteractionCategory(object);

    comp.create = function() {
      Api.main(object, this.build.bind(this), this.empty.bind(this));
    };

    comp.nextPageReuest = function(object, resolve, reject) {
      Api.main(object, resolve.bind(comp), reject.bind(comp));
    };

    comp.cardRender = function(object, element, card) {
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
   * Collection component to list either the 500 movies or 500 series in pages of 50.
   */
  function kinopoiskCollectionComponent(object) {
    const comp = new Lampa.InteractionCategory(object);
    const ITEMS_PER_PAGE = 50;

    comp.create = function() {
      Api.full(
        object,
        (data) => {
          comp.allResults = data.results;
          comp.total_pages = Math.ceil(comp.allResults.length / ITEMS_PER_PAGE);
          comp.loadPage(1);
        },
        comp.empty.bind(comp)
      );
    };

    comp.nextPageReuest = function(object, resolve, reject) {
      comp.loadPage(object.page, resolve, reject);
    };

    comp.loadPage = function(page, resolve, reject) {
      const start = (page - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const pageResults = comp.allResults.slice(start, end);

      const data = {
        results: pageResults,
        total_pages: comp.total_pages,
        page
      };

      if (resolve) resolve(data);
      else comp.build(data);
    };

    comp.cardRender = function(object, element, card) {
      card.onMenu = false;
      card.onEnter = () => {
        const isSeries =
          object.url === 'series' || object.url === 'top500series';
        Lampa.Activity.push({
          component: 'full',
          id: element.id,
          method: isSeries ? 'tv' : 'movie',
          card: element
        });
      };

      // Display rank badge if applicable
      if (element.rank) {
        const rankBadge = $(`
          <div style="
            position:absolute;
            top:8px;
            left:8px;
            background:gold;
            color:black;
            font-weight:bold;
            border-radius:8px;
            padding:2px 6px;
            font-size:1.4em;
            box-shadow:0 0 8px rgba(0,0,0,0.3);
            z-index:2;
          ">
            ${element.rank}
          </div>
        `);
        card.render().append(rankBadge);
      }
    };

    return comp;
  }

  /**
   * Plugin initialization & menu button registration
   */
  function initPlugin() {
    const manifest = {
      type: 'video',
      version: '1.0.0',
      name: 'Кинопоиск',
      description: 'Топ 500 фильмов и сериалов с Кинопоиска',
      component: 'kinopoisk_main'
    };

    // Register main and collection components
    Lampa.Component.add('kinopoisk_main', kinopoiskMainComponent);
    Lampa.Component.add('kinopoisk_collection', kinopoiskCollectionComponent);

    // Add the plugin button to the menu
    const addMenuButton = () => {
      const button = $(`
        <li class="menu__item selector">
          <div class="menu__ico">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="-110 -110 220 220" width="64" height="64">
              <path fill="rgb(255,255,255)"
                d="M110,-108.5C110,-108.5-52.109,-22.912-52.109,-22.912C-52.109,-22.912,32.371,-108.5,32.371,-108.5C32.371,-108.5,-14.457,-108.5,-14.457,-108.5C-14.457,-108.5,-71.971,-29.757,-71.971,-29.757C-71.971,-29.757,-71.971,-108.5,-71.971,-108.5C-71.971,-108.5,-110,-108.5,-110,-108.5C-110,-108.5,-110,108.5,-110,108.5C-110,108.5,-71.971,108.5,-71.971,108.5C-71.971,108.5,-71.971,29.884,-71.971,29.884C-71.971,29.884,-14.457,108.5,-14.457,108.5C-14.457,108.5,32.371,108.5,32.371,108.5C32.371,108.5,-49.915,25.603,-49.915,25.603C-49.915,25.603,110,108.5,110,108.5C110,108.5,110,68.2,110,68.2C110,68.2,-35.854,10.484,-35.854,10.484C-35.854,10.484,110,20.15,110,20.15C110,20.15,110,-20.15,110,-20.15C110,-20.15,-34.93,-10.856,-34.93,-10.856C-34.93,-10.856,110,-68.2,110,-68.2C110,-68.2,110,-108.5,110,-108.5Z"
              />
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

    // Add the button to the menu once the app is ready
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
