# CAD House Finder

A lightweight Node.js web application that scrapes Canadian real-estate listings, lets you filter by price, beds, baths, square footage and region, and preview each property in a modal iframe. No third-party map APIs—just a clean, responsive UI and server-side fetching.

Repository: https://github.com/CanadianHouseFinder/CADHouseFInder

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
  
    '''git clone https://github.com/CanadianHouseFinder/CADHouseFInder.git'''
    '''cd CADHouseFInder'''
   

3. Install dependencies
   
   npm install
   


## Usage

1. Start the server  
   
   npm start
   

2. Open your browser and go to  
   
   http://localhost:3000
   
3. Set your filters (price, beds, baths, square footage) and click **Grab Latest Houses**  
4. Choose a region from the dropdown to display its listings table  
5. Click **Preview** next to any listing to open a modal with the property page

## Project Structure

CADHouseFInder/  
├─ server.js           # Express server and /refresh endpoint  
├─ package.json        # Dependencies and scripts  
└─ public/  
   ├─ index.html       # Main UI template (Pug or static HTML)  
   ├─ styles.css       # Base & responsive styles  
   └─ app.js           # Client-side filters, modal & fetch logic  

## How It Works

1. The client collects filter settings and sends them via `POST /refresh` to the server.  
2. The server scrapes listings matching those filters, caches them in memory, and responds.  
3. The client reloads to render updated tables (one per region), hidden by default.  
4. Selecting a region shows its table; clicking **Preview** lazy-loads the iframe URL into a modal overlay.


## License

This project is released under a **Free Non-Commercial License**. You are free to use, modify, fork, and distribute this software for any purpose **except** selling it or distributing it for commercial gain without explicit permission from the author.
