// 1. Web App entry point:
// — принимает ?link=… и запускает геокодинг
// - ?mode=json — возвращаем точки в формате JSON
function doGet(e) {
  const mode = e.parameter.mode;
  const sourceUrl = e.parameter.link;

  // Если запрос с ?mode=json — возвращаем точки в формате JSON
  if (mode === 'json') {
    return serveJson();
  }

  // Если передан link — запускаем геокодирование
  if (sourceUrl) {
    try {
      geocodeWithNominatim(sourceUrl);
      return ContentService
        .createTextOutput('✅ Uruchomiono geokodowanie')
        .setMimeType(ContentService.MimeType.TEXT);
    } catch (err) {
      return ContentService
        .createTextOutput('❌ Błąd: ' + err.message)
        .setMimeType(ContentService.MimeType.TEXT);
    }
  }

  // Если ничего не передано — сообщение по умолчанию
  return ContentService
    .createTextOutput('❌ Brak parametru "link" lub "mode"')
    .setMimeType(ContentService.MimeType.TEXT);
}



// 2. Основная функция геокодинга — теперь принимает ссылку на таблицу
function geocodeWithNominatim(sourceUrl) {
  // извлекаем ID из переданной ссылки
  const fileIdMatch = sourceUrl.match(/\/d\/([a-zA-Z0-9\-_]+)/);
  if (!fileIdMatch) throw new Error('Niepoprawny link do arkusza');
  const fileId = fileIdMatch[1];

  // открываем внешнюю таблицу
  let sourceSpreadsheet;
  try {
    sourceSpreadsheet = SpreadsheetApp.openById(fileId);
  } catch (e) {
    throw new Error('Brak dostępu do arkusza lub nie istnieje');
  }

  const sourceSheet = sourceSpreadsheet.getSheetByName('Arkusz1');
  if (!sourceSheet) throw new Error('Nie znaleziono arkusza "Arkusz1"');

  const data = sourceSheet.getDataRange().getValues();
  const results = [['Opis', 'Szerokość', 'Długość']];
  results.push([ 'E.Leclerc',  '52.19896871763645',  '20.93567137519389' ]);

  const warsawDistricts = [
    'Włochy','Ochota','Mokotów','Ursynów','Wola','Żoliborz','Bielany',
    'Śródmieście','Praga-Północ','Praga-Południe','Targówek','Rembertów',
    'Wawer','Ursus','Bemowo','Białołęka','Wilanów'
  ];

  for (let i = 1; i < data.length; i++) {
    const [ , , timeRaw, , , , , city, street, number ] = data[i];
    if (!timeRaw || !street || !number || !city || city === 'Miasto') continue;

    const cleanedNumber = sanitizeHouseNumber(number);
    if (!cleanedNumber) {
        continue;
    }

    
    // время
    let time = '';
    try {
      const t = timeRaw.toString().trim();
      time = t.includes(' ') ? t.split(' ').slice(1).join(' ') : t;
    } catch {}

    // город
    const cityNorm = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    const cityFixed = warsawDistricts.includes(cityNorm) ? 'Warszawa' : city;

    const fullAddress = `${street} ${cleanedNumber}, ${cityFixed}, Poland`;
    

    const encoded = encodeURIComponent(fullAddress);
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}`;
    const response = fetchWithRetry(nomUrl, 5);
    if (!response) {
      results.push([`Błąd | ${fullAddress}`, 'Błąd', 'Błąd']);
      continue;
    }

    const json = JSON.parse(response.getContentText());
    if (json.length && json[0].lat && json[0].lon) {
      const label = `${time} | ${street} ${cleanedNumber}, ${cityFixed}`;
      results.push([label, json[0].lat, json[0].lon]);
    } else {
      results.push([`Nie znaleziono | ${fullAddress}`, 'Nie znaleziono', 'Nie znaleziono']);
    }

    Utilities.sleep(1500 + Math.floor(Math.random() * 1000));
  }

  // Записываем результаты в Wyniki текущей таблицы
  const current = SpreadsheetApp.getActiveSpreadsheet();
  let out = current.getSheetByName('Wyniki');
  if (!out) out = current.insertSheet('Wyniki');
  else out.clear();
  out.getRange(1, 1, results.length, 3).setValues(results);
}

// 3. Устойчивый fetch с retry
function fetchWithRetry(url, maxAttempts) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        headers: { 'User-Agent': 'Google Apps Script – for personal use only' }
      });
      if (res.getResponseCode() === 200) return res;
    } catch (e) {
      
    }
    Utilities.sleep(1500 + Math.floor(Math.random() * 1000));
  }
  return null;
}

// 4. Очистка номера дома
function sanitizeHouseNumber(input) {
  let s = input.toString().toLowerCase().trim();
  s = s.replace(/bud\.?|blok|bl\.?|budynek|lokal|lok\.*|apt\.?|mieszkanie/gi, '');
  s = s.replace(/[,\.]/g, '').replace(/\s+/g, '');
  const m = s.match(/^\d+[a-zA-Z]?(\/\d+[a-zA-Z]?)?/);
  return m ? m[0] : '';
}

// 5. Передача геокода на карту leaflet
function serveJson() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Wyniki');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const result = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const entry = {};
    headers.forEach((h, j) => entry[h] = row[j]);

    if (entry.Szerokość && entry.Długość) {
      result.push({
        name: entry.Opis || '',
        lat: parseFloat(entry.Szerokość),
        lng: parseFloat(entry.Długość)
      });
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

