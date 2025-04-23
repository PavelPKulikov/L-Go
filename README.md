# 📦 L-Go: Courier Geocoding & Map Visualization

This project automates the extraction and geocoding of delivery addresses from a Google Spreadsheet and displays the results on an interactive Leaflet map. It is designed to support local courier teams in planning and executing daily routes.

---

## 🧾 Input Spreadsheet Structure

The project processes a Google Sheet with the following relevant columns (based on the file `druk dla kuriera - 18,04.xlsx`):

| Column | Header             | Purpose                                |
|--------|--------------------|----------------------------------------|
| C      | Realizacja         | ⏱️ Delivery time window (only the time) |
| H      | Miasto             | 🏙️ City or district in Warsaw          |
| I      | Ulica              | 🛣️ Street                              |
| J      | Nr. domu           | 🏠 House number                        |
| L      | Uwagi              | Additional address info (optional)     |

The full address is assembled as:  
`{Ulica} {Nr. domu}, {Miasto}, Poland`

If `{Miasto}` is a district of Warsaw (e.g. "Włochy", "Mokotów"), it is automatically converted to `"Warszawa"` during geocoding.

---

## ⚙️ How It Works

### 1. Google Apps Script (`kod.gas`)

- Receives a link to a Google Sheet via `?link=...`
- Extracts rows from the sheet `Arkusz1` (or similar)
- Builds full addresses and geocodes via **OpenStreetMap Nominatim**
- Saves results in a new sheet `Wyniki`:
  - Description (e.g. "11:00–12:00 | ul. Zdobnicza 3, Warszawa")
  - Latitude
  - Longitude
- Also exposes results via `?mode=json` as API for the map

### 2. Interface: `index.html`

- Input field to paste the Google Sheet link
- "Start geocoding" button launches the GAS web app
- Link to open the map (`map.html`)

### 3. Map View: `map.html`

- Fetches geocoded data from the JSON endpoint
- Displays markers with delivery time slots
- Lets users select points and view the route
- Works on mobile and desktop

---

## ✅ Features

- One-click geocoding of spreadsheet addresses
- Auto-correction of Warsaw district names
- JSON API for live map integration
- Responsive mobile interface with Leaflet.js

---

## 🔜 Planned Features

- [ ] Filtering markers by courier
- [ ] Automatic courier assignment and route optimization

---

## 🛠️ Technologies

- Google Apps Script
- Google Sheets
- OpenStreetMap Nominatim API
- HTML / JavaScript
- Leaflet.js

---

## 📄 License

MIT License
