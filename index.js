const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs').promises;
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

const PORT = process.env.PORT || 3000;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

// Serve static files from the "public" directory
app.use(express.static('public'));

app.get('/client', async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', req.url, new Date().toLocaleString());

  try {
    const auth = await authorize();
    const searchQuery = req.query.search || ''; // Get the search query from request
    console.log(searchQuery);

    const sheets = google.sheets({ version: 'v4', auth });

    // Get the sheet properties to find the last row with data
    const sheetPropertiesResponse = await sheets.spreadsheets.get({
      spreadsheetId: '1ACpGIUQ_EA42Ym_yDxNpb81DWHLXSTX1jHzq7cnNxdI',
      ranges: ['Clients!A1:I'],
      fields: 'sheets(properties(sheetId,title,gridProperties(rowCount)))',
    });

    const sheetProperties = sheetPropertiesResponse.data.sheets[0].properties;
    const lastRow = sheetProperties.gridProperties.rowCount;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '1ACpGIUQ_EA42Ym_yDxNpb81DWHLXSTX1jHzq7cnNxdI',
      range: `Clients!A1:I${lastRow}`, // Use the last row with data
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      res.json([]);
    } else {
      // Filter the rows based on the search query in columns 1 and 2
      const filteredRows = rows.filter((row, index) => {
        // Always include the first row (index 0)
        if (index === 0) return true;

        // Check if row[1] or row[2] contains the searchQuery (case-insensitive)
        return row[1].toLowerCase().includes(searchQuery.toLowerCase()) || row[2].toLowerCase().includes(searchQuery.toLowerCase());
      });

      res.json(filteredRows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching data');
  }
});

app.get('/therapist', async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', req.url, new Date().toLocaleString());

  try {
    const auth = await authorize();
    const searchQuery = req.query.search || ''; // Get the search query from request

    const sheets = google.sheets({ version: 'v4', auth });

    // Get the sheet properties to find the last row with data
    const sheetPropertiesResponse = await sheets.spreadsheets.get({
      spreadsheetId: '1ACpGIUQ_EA42Ym_yDxNpb81DWHLXSTX1jHzq7cnNxdI',
      ranges: ['Therapists!A1:I'],
      fields: 'sheets(properties(sheetId,title,gridProperties(rowCount)))',
    });

    const sheetProperties = sheetPropertiesResponse.data.sheets[0].properties;
    const lastRow = sheetProperties.gridProperties.rowCount;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '1ACpGIUQ_EA42Ym_yDxNpb81DWHLXSTX1jHzq7cnNxdI',
      range: `Therapists!A1:I${lastRow}`, // Use the last row with data
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found.');
      res.json([]);
    } else {
      // Filter the rows based on the search query in columns 1 and 2
      const filteredRows = rows.filter((row, index) => {
        // Always include the first row (index 0)
        if (index === 0) return true;

        // Check if row[1] or row[2] contains the searchQuery (case-insensitive)
        return row[1].toLowerCase().includes(searchQuery.toLowerCase()) || row[2].toLowerCase().includes(searchQuery.toLowerCase());
      });

      res.json(filteredRows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching data');
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


const globalVariable = "This is a global variable";
app.get('/', (req, res) => {
  res.render('index', { globalVariable });
});
