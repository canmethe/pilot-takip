# Pilot Flight Tracker

This is a simple web app for pilots to track flight logs and visualize them on a calendar.

## Features

- View flights on a calendar
- Add new flight entries
- View flight details
- Delete flight records
- Load demo data
- Store data in the browser using localStorage ..

## Hosting

This project is a static website and can be hosted on any static host (GitHub Pages, Google Sites, or a simple web server).

### Embedding in Google Sites

If you want to embed the app in Google Sites, use an iframe with the hosted `index.html` URL. Example:

```html
<iframe src="/path/to/index.html" width="100%" height="800" frameborder="0"></iframe>
```

## Run locally

1. Download or clone the files to your computer
2. Open `index.html` in a browser or serve the folder with a simple HTTP server
3. The app is ready to use

## Usage

1. Use the "Add New Flight" form to enter flight information
2. Saved flights appear on the calendar
3. Click a calendar entry to view details
4. Use the "Load Demo Data" button to populate sample flights

## Notes

- Data is stored in the browser's localStorage
- Clearing browser data will remove saved records
- Calendar view can be switched between month/week/day