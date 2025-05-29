# CAD House Finder

A lightweight Node.js web application that scrapes Canadian real-estate listings, lets you filter by price, beds, baths, square footage and region, and preview each property in a modal iframe. No third-party map APIs—just a clean, responsive UI and server-side fetching.

Repository: https://github.com/CanadianHouseFinder/CADHouseFInder

##Running on WebServer

https://cadhousefinder.onrender.com/

## Features

- Fetch and cache the latest property listings  
- Filter by min/max price, beds, baths, and square footage  
- Browse listings by region  
- Preview property pages in an embedded modal  
- Responsive design for desktop and mobile  

## Prerequisites

- Node.js v14 or higher  
- npm v6 or higher  

## Installation

1. Clone the repository
  
  ```sh
  git clone https://github.com/CanadianHouseFinder/CADHouseFInder.git
  ```
  ```sh
  cd CADHouseFInder
  ```

3. Install dependencies
  ```sh
  npm install
  ```


## Usage

1. Start the server  
  ```sh
  npm start
  ```

2. Open your browser and go to  
   
  http://localhost:3000
   
3. Set your filters (price, beds, baths, square footage) and click **Grab Latest Houses**  
4. Choose a region from the dropdown to display its listings table  
5. Click **Preview** next to any listing to open a modal with the property page

## Project Structure
```
CADHouseFInder/
├─ app.js               # Main Express server & /refresh endpoint
├─ package.json         # Dependencies & npm scripts
├─ package-lock.json    # Exact dependency versions
├─ bin/                 # CLI scripts (if any)
├─ node_modules/        # Installed packages
├─ public/              # Static assets served via express.static()
│  ├─ styles.css        # Base & responsive CSS
│  └─ [other files…]    # Images, client-side JS (if any), etc.
├─ routes/              # Route definitions
│  └─ index.js          # Renders home page and handles /refresh
└─ views/               # Pug templates
   ├─ index.jade        # Main UI (filters, tables, modals)
   └─ error.jade        # 404 / error view
```
## How It Works

CAD House Finder is powered by a simple Express server that scrapes REMAX listings, stores them in memory, and serves a dynamic front-end. Here’s the end-to-end flow in plain English:

1. Server Initialization  
   • When the app starts, it loads default filter values (price range, beds, baths, square footage, house-only flag).  
   • It then performs an initial “bootstrap” scrape of every defined Canadian region, collecting URLs, prices, bed/bath counts, and addresses into an in-memory store.

2. Defining Regions & Filters  
   • A fixed list of REMAX base URLs (one per province or territory) lives in the code.  
   • Filters are kept in a single object that can be updated at runtime. This object drives how query parameters are attached to each base URL.

3. Building Filtered URLs  
   • Before fetching listings, the server takes a region’s base URL and appends only the non-empty filter parameters (min/max price, bedrooms, etc.).  
   • This ensures “no minimum” or “no maximum” options work correctly without bloating the URL.

4. Scraping Listings  
   • The server uses a cookie-aware HTTP client that fakes a modern browser’s User-Agent.  
   • It fetches the HTML for each region’s filtered page. Optionally, a headless-DOM step can run simple JavaScript if needed.  
   • Cheerio parses the resulting HTML and extracts each property’s link, price, beds, baths, and address into a JavaScript array.

5. Caching Results  
   • Scraped data for all regions is stored in a single in-memory object keyed by region name.  
   • On errors (network timeout or parse issues), that region simply holds an empty list until the next successful scrape.

6. Serving the Front-End  
   • A Pug template renders the home page. It loops over every region’s cached listings and hides all tables by default.  
   • The current filter settings are injected so the UI can display them in the form inputs.

7. Refresh Workflow  
   • When a user submits new filters (“Grab Latest Houses”), the browser sends a POST to `/refresh`.  
   • The server merges the incoming filters with the defaults and re-runs the bootstrap scrape.  
   • Once complete, it returns HTTP 200, and the client reloads the page to pick up fresh data.

8. Error Handling & Resilience  
   • Any invalid route returns a 404 page.  
   • Unexpected server errors render a friendly error view, with full stack traces only shown in development mode.  
   • Scraping failures for individual regions do not crash the whole app—they simply log an error and continue.

9. Continuous Operation  
   • After the initial scrape, the server listens on port 3000 (or the port defined in the environment).  
   • Every time filters change, the same scrape → cache → render cycle repeats, giving users up-to-date listings with minimal manual effort.


## License

This project is released under a **Free Non-Commercial License**. You are free to use, modify, fork, and distribute this software for any purpose **except** selling it or distributing it for commercial gain without explicit permission from the author.
