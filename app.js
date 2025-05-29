var createError   = require('http-errors');
var express       = require('express');
var path          = require('path');
var cookieParser  = require('cookie-parser');
var logger        = require('morgan');

// scraping deps
// ------------------------------
// got@14 is ESM-only; in a CommonJS file we grab .default if it exists
const _got         = require('got');
const got          = _got.default || _got;
const { CookieJar } = require('tough-cookie');
const cheerio       = require('cheerio');
const { JSDOM }     = require('jsdom');

var app   = express();
const PORT = process.env.PORT || 3000;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// standard Express middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// in-memory store for scraped data
const allRegions = {};

// your regions & base URLs
const regions = {
  Alberta:                'https://www.remax.ca/ab?lang=en&pageNumber=1',
  Manitoba:               'https://www.remax.ca/mb/winnipeg-real-estate?lang=en&pageNumber=1',
  'New Brunswick':        'https://www.remax.ca/nb?lang=en&pageNumber=1',
  Quebec:                 'https://www.remax.ca/find-real-estate?lang=en&pageNumber=1',
  Saskatchewan:           'https://www.remax.ca/sk?lang=en&pageNumber=1',
  'Nova Scotia':          'https://www.remax.ca/ns?lang=en&pageNumber=1',
  'British Columbia':     'https://www.remax.ca/bc?lang=en&pageNumber=1',
  Ontario:                'https://www.remax.ca/en/on?lang=en&province=on&pageNumber=1',
  'Prince Edward Island': 'https://www.remax.ca/pe?lang=en&pageNumber=1',
  Newfoundland:           'https://www.remax.ca/nl?lang=en&pageNumber=1',
};

// helper to append filter params
function buildFilteredUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set('priceMin',  '100000');
  url.searchParams.set('priceMax',  '500000');
  url.searchParams.set('bedsMin',   '3');
  url.searchParams.set('bedsMax',   '5');
  url.searchParams.set('bathsIndex','2');
  url.searchParams.set('sqftMin',   '1750');
  url.searchParams.set('sqftMax',   '2500');
  url.searchParams.set('house',     'true');
  return url.toString();
}

// core scraping: fetch + parse
async function scrapeListings(url, useJs = false) {
  const jar = new CookieJar();
  const client = got.extend({
    cookieJar: jar,
    headers: {
      // valid User-Agent string—no funky ellipsis
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/114.0.0.0 Safari/537.36'
    },
    timeout: { request: 15000 },
    retry: { limit: 2 },
  });

  // fetch filtered page
  let resp = await client.get(buildFilteredUrl(url));
  let html = resp.body;

  // optional jsdom pass if page needs client-side JS
  if (useJs) {
    const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
    await new Promise(r => dom.window.addEventListener('load', r));
    html = dom.serialize();
  }

  // parse with cheerio
  const $   = cheerio.load(html);
  const out = [];

  $('a.listing-card_listingCard__lc4CL').each((i, el) => {
    const listing = $(el);
    const href    = listing.attr('href') || '';
    const fullUrl = href.startsWith('http')
                  ? href
                  : `https://www.remax.ca${href}`;

    out.push({
      URL:     fullUrl,
      Price:   listing.find('h2.listing-card_price__lEBmo span').text().trim()      || 'N/A',
      Beds:    listing.find('[data-cy="property-beds"]').text().trim()               || 'N/A',
      Baths:   listing.find('[data-cy="property-baths"]').text().trim()              || 'N/A',
      Address: listing.find('[data-cy="property-address"]').text().trim()            || 'N/A',
    });
  });

  return out;
}

// run through all regions in series
async function bootstrap() {
  console.log('🕵️‍♀️  Starting scrape of all regions...');
  for (const [region, url] of Object.entries(regions)) {
    process.stdout.write(`  → ${region}… `);
    try {
      const list = await scrapeListings(url /*, true if JS-heavy */);
      allRegions[region] = list;
      console.log(`${list.length} listings`);
    } catch (err) {
      console.error(`error (${err.message})`);
      allRegions[region] = [];
    }
  }
  console.log('✅ Scrape complete');
}

// GET home page
app.get('/', (req, res) => {
  res.render('index', { data: allRegions });
});

// POST /refresh
app.post('/refresh', async (req, res, next) => {
  try {
    await bootstrap();
    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

// optional users router
var usersRouter = require('./routes/users');
app.use('/users', usersRouter);

// 404 handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error   = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// initial scrape, then listen
bootstrap()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  });