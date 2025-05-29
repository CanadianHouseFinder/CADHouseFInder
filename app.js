var createError   = require('http-errors');
var express       = require('express');
var path          = require('path');
var cookieParser  = require('cookie-parser');
var logger        = require('morgan');

// scraping deps
// got@14 is ESM-only; in CommonJS we grab .default if present
const _got          = require('got');
const got           = _got.default || _got;
const { CookieJar } = require('tough-cookie');
const cheerio       = require('cheerio');
const { JSDOM }     = require('jsdom');

var app   = express();
const PORT = process.env.PORT || 3000;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// standard middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// in-memory store for scraped results
const allRegions = {};

// region base URLs
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

// default, mutable filters
const defaultFilters = {
  priceMin:   '100000',
  priceMax:   '500000',
  bedsMin:    '3',
  bedsMax:    '5',
  bathsIndex: '2',
  sqftMin:    '1750',
  sqftMax:    '2500',
  house:      'true'
};
let currentFilters = { ...defaultFilters };

// build URL with query filters
function buildFilteredUrl(baseUrl, filters) {
  const url = new URL(baseUrl);
  for (const [key, val] of Object.entries(filters)) {
    if (val !== '' && val != null) url.searchParams.set(key, val);
  }
  return url.toString();
}

// scrape one page given filters
async function scrapeListings(baseUrl, filters, useJs = false) {
  const jar = new CookieJar();
  const client = got.extend({
    cookieJar: jar,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/114.0.0.0 Safari/537.36'
    },
    timeout: { request: 15000 },
    retry:   { limit: 2 },
  });

  const fullUrl = buildFilteredUrl(baseUrl, filters);
  const resp    = await client.get(fullUrl);
  let html      = resp.body;

  if (useJs) {
    const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
    await new Promise(r => dom.window.addEventListener('load', r));
    html = dom.serialize();
  }

  const $   = cheerio.load(html);
  const out = [];
  $('a.listing-card_listingCard__lc4CL').each((i, el) => {
    const listing = $(el);
    const href    = listing.attr('href') || '';
    const full    = href.startsWith('http') ? href : `https://www.remax.ca${href}`;
    out.push({
      URL:     full,
      Price:   listing.find('h2.listing-card_price__lEBmo span').text().trim()      || 'N/A',
      Beds:    listing.find('[data-cy="property-beds"]').text().trim()               || 'N/A',
      Baths:   listing.find('[data-cy="property-baths"]').text().trim()              || 'N/A',
      Address: listing.find('[data-cy="property-address"]').text().trim()            || 'N/A',
    });
  });
  return out;
}

// scrape all regions with given filters
async function bootstrap(filters) {
  console.log('🕵️‍♀️  Scraping with filters:', filters);
  for (const [region, baseUrl] of Object.entries(regions)) {
    process.stdout.write(`  → ${region}… `);
    try {
      allRegions[region] = await scrapeListings(baseUrl, filters /*, useJs? */);
      console.log(`${allRegions[region].length} listings`);
    } catch (err) {
      console.error(`error (${err.message})`);
      allRegions[region] = [];
    }
  }
  console.log('✅ Scrape complete');
}

// GET home: render with current data & filters
app.get('/', (req, res) => {
  res.render('index', {
    data:    allRegions,
    filters: currentFilters
  });
});

// POST refresh: accept new filters, re-scrape
app.post('/refresh', async (req, res, next) => {
  try {
    // override filters
    currentFilters = { ...defaultFilters, ...req.body.filters };
    await bootstrap(currentFilters);
    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

// optional users router
var usersRouter = require('./routes/users');
app.use('/users', usersRouter);

// catch 404
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

// initial scrape then start server
bootstrap(currentFilters)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  });