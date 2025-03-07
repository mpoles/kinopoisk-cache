!function(){"use strict";if(window.kinopoisk_ready)return;window.kinopoisk_ready=!0;let _="https://mpoles.github.io/kinopoisk-cache/data.json",e=new Lampa.Reguest,t=(t,i,n)=>{e.silent(_,_=>{let{movies_cover:e,series_cover:t}=_;i({results:[{title:"Топ 500 фильмов",img:e,hpu:"movies"},{title:"Топ 500 сериалов",img:t,hpu:"series"}],total_pages:1,collection:!0})},n)},i=(t,i,n)=>{e.silent(_,_=>{let{movies:e=[],series:n=[]}=_,o=["movies","top500movies"].includes(t.url)?e:["series","top500series"].includes(t.url)?n:[];i({results:o,total_pages:1})},n)},n=()=>e.clear(),o={main:t,full:i,clear:n},s=_=>{let e=new Lampa.InteractionCategory(_);return e.create=function(){o.main(_,this.build.bind(this),this.empty.bind(this))},e.nextPageReuest=function(_,t,i){o.main(_,t.bind(e),i.bind(e))},e.cardRender=function(_,e,t){t.onMenu=!1,t.onEnter=()=>{Lampa.Activity.push({url:e.hpu,title:e.title,component:"kinopoisk_collection",page:1})}},e},l=_=>{let e=new Lampa.InteractionCategory(_);return e.create=function(){o.full(_,_=>{e.allResults=_.results,e.total_pages=Math.ceil(e.allResults.length/50),e.loadPage(1)},e.empty.bind(e))},e.nextPageReuest=function(_,t,i){e.loadPage(_.page,t,i)},e.loadPage=function(_,t,i){let n=(_-1)*50,o=e.allResults.slice(n,n+50),s={results:o,total_pages:e.total_pages,page:_};t?t(s):e.build(s)},e.cardRender=function(_,e,t){if(t.onMenu=!1,t.onEnter=()=>{let t=["series","top500series"].includes(_.url);Lampa.Activity.push({component:"full",id:e.id,method:t?"tv":"movie",card:e})},e.rank){let i=$(`
          <div style="
            position:absolute;
            top:8px; left:8px;
            background:gold; color:black;
            font-weight:bold; border-radius:8px;
            padding:2px 6px; font-size:1.4em;
            box-shadow:0 0 8px rgba(0,0,0,0.3);
            z-index:2;">
            ${e.rank}
          </div>
        `);t.render().append(i)}},e};(()=>{let _={type:"video",version:"1.0.0",name:"Кинопоиск",description:"Топ 500 фильмов и сериалов с Кинопоиска",component:"kinopoisk_main"};Lampa.Component.add("kinopoisk_main",s),Lampa.Component.add("kinopoisk_collection",l);let e=()=>{let e=$(`
        <li class="menu__item selector">
          <div class="menu__ico">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="-110 -110 220 220" width="64" height="64">
              <path fill="rgb(255,255,255)" d="M110,-108.5C110,-108.5-52.109,-22.912-52.109,-22.912C-52.109,-22.912,32.371,-108.5,32.371,-108.5C32.371,-108.5,-14.457,-108.5,-14.457,-108.5C-14.457,-108.5,-71.971,-29.757,-71.971,-29.757C-71.971,-29.757,-71.971,-108.5,-71.971,-108.5C-71.971,-108.5,-110,-108.5,-110,-108.5C-110,-108.5,-110,108.5,-110,108.5C-110,108.5,-71.971,108.5,-71.971,108.5C-71.971,108.5,-71.971,29.884,-71.971,29.884C-71.971,29.884,-14.457,108.5,-14.457,108.5C-14.457,108.5,32.371,108.5,32.371,108.5C32.371,108.5,-49.915,25.603,-49.915,25.603C-49.915,25.603,110,108.5,110,108.5C110,108.5,110,68.2,110,68.2C110,68.2,-35.854,10.484,-35.854,10.484C-35.854,10.484,110,20.15,110,20.15C110,20.15,110,-20.15,110,-20.15C110,-20.15,-34.93,-10.856,-34.93,-10.856C-34.93,-10.856,110,-68.2,110,-68.2C110,-68.2,110,-108.5,110,-108.5Z"/>
            </svg>
          </div>
          <div class="menu__text">${_.name}</div>
        </li>
      `);e.on("hover:enter",()=>{Lampa.Activity.push({url:"",title:_.name,component:"kinopoisk_main",page:1})}),$(".menu .menu__list").first().append(e)};window.appready?e():Lampa.Listener.follow("app",_=>{"ready"===_.type&&e()})})()}();
