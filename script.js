!function(){"use strict";if(window.kinopoisk_ready)return;window.kinopoisk_ready=!0;let _=new Lampa.Reguest,e=null;function t(){return new Promise((t,n)=>{if(e){t(e);return}_.silent("https://mpoles.github.io/kinopoisk-cache/data.json",_=>{e=_,t(_)},_=>n(_))})}let n=(_,e,n)=>{t().then(_=>{let{movies_cover:t,series_cover:n}=_||{};e({results:[{title:"Топ 500 фильмов",img:t,hpu:"movies"},{title:"Топ 500 сериалов",img:n,hpu:"series"}],total_pages:1,collection:!0})}).catch(n)},i=(_,e,n)=>{t().then(t=>{let{movies:n=[],series:i=[]}=t||{},o=[],l="movies"===_.url||"top500movies"===_.url,s="series"===_.url||"top500series"===_.url;l?o=n:s&&(o=i);let a={results:o,total_pages:1};e(a)}).catch(n)},o={main:n,full:i,clear:function e(){_.clear()}};function l(_){let e=new Lampa.InteractionCategory(_);return e.create=function(){o.main(_,this.build.bind(this),this.empty.bind(this))},e.nextPageReuest=function(_,t,n){o.main(_,t.bind(e),n.bind(e))},e.cardRender=function(_,e,t){t.onMenu=!1,t.onEnter=()=>{Lampa.Activity.push({url:e.hpu,title:e.title,component:"kinopoisk_collection",page:1})}},e}function s(_){let e=new Lampa.InteractionCategory(_);return e.create=function(){o.full(_,_=>{e.allResults=_.results,e.total_pages=Math.ceil(e.allResults.length/50),e.loadPage(1)},e.empty.bind(e))},e.nextPageReuest=function(_,t,n){e.loadPage(_.page,t,n)},e.loadPage=function(_,t,n){let i=(_-1)*50,o=e.allResults.slice(i,i+50),l={results:o,total_pages:e.total_pages,page:_};t?t(l):e.build(l)},e.cardRender=function(_,e,t){if(t.onMenu=!1,t.onEnter=()=>{let t="series"===_.url||"top500series"===_.url;Lampa.Activity.push({component:"full",id:e.id,method:t?"tv":"movie",card:e})},e.rank){let n=$(`
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
            ${e.rank}
          </div>
        `);t.render().append(n)}},e}!function _(){let e={type:"video",version:"1.0.0",name:"Кинопоиск",description:"Топ 500 фильмов и сериалов с Кинопоиска",component:"kinopoisk_main"};Lampa.Component.add("kinopoisk_main",l),Lampa.Component.add("kinopoisk_collection",s);let t=()=>{let _=$(`
        <li class="menu__item selector">
          <div class="menu__ico">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="-110 -110 220 220" width="64" height="64">
              <path fill="rgb(255,255,255)"
                d="M110,-108.5C110,-108.5-52.109,-22.912-52.109,-22.912C-52.109,-22.912,32.371,-108.5,32.371,-108.5C32.371,-108.5,-14.457,-108.5,-14.457,-108.5C-14.457,-108.5,-71.971,-29.757,-71.971,-29.757C-71.971,-29.757,-71.971,-108.5,-71.971,-108.5C-71.971,-108.5,-110,-108.5,-110,-108.5C-110,-108.5,-110,108.5,-110,108.5C-110,108.5,-71.971,108.5,-71.971,108.5C-71.971,108.5,-71.971,29.884,-71.971,29.884C-71.971,29.884,-14.457,108.5,-14.457,108.5C-14.457,108.5,32.371,108.5,32.371,108.5C32.371,108.5,-49.915,25.603,-49.915,25.603C-49.915,25.603,110,108.5,110,108.5C110,108.5,110,68.2,110,68.2C110,68.2,-35.854,10.484,-35.854,10.484C-35.854,10.484,110,20.15,110,20.15C110,20.15,110,-20.15,110,-20.15C110,-20.15,-34.93,-10.856,-34.93,-10.856C-34.93,-10.856,110,-68.2,110,-68.2C110,-68.2,110,-108.5,110,-108.5Z"
              />
            </svg>
          </div>
          <div class="menu__text">${e.name}</div>
        </li>
      `);_.on("hover:enter",()=>{Lampa.Activity.push({url:"",title:e.name,component:"kinopoisk_main",page:1})}),$(".menu .menu__list").eq(0).append(_)};window.appready?t():Lampa.Listener.follow("app",_=>{"ready"===_.type&&t()})}()}();
