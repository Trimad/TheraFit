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

// Add a global variable called "data" to store client and therapist data
let data = {
  clients: [],
  therapists: [],
};

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

async function fetchData() {

  const id = "1ACpGIUQ_EA42Ym_yDxNpb81DWHLXSTX1jHzq7cnNxdI"
  const auth = await authorize();
  const sheets = google.sheets({ version: 'v4', auth });

  // Get the sheet properties to find the last row with data for Clients
  const clientSheetPropertiesResponse = await sheets.spreadsheets.get({
    spreadsheetId: id,
    ranges: ['Clients!A1:I'],
    fields: 'sheets(properties(sheetId,title,gridProperties(rowCount)))',
  });

  const clientSheetProperties = clientSheetPropertiesResponse.data.sheets[0].properties;
  const clientLastRow = clientSheetProperties.gridProperties.rowCount;

  // Fetch client data
  const clientResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `Clients!A1:I${clientLastRow}`,
  });
  data.clients = clientResponse.data.values || [];

  // Get the sheet properties to find the last row with data for Therapists
  const therapistSheetPropertiesResponse = await sheets.spreadsheets.get({
    spreadsheetId: id,
    ranges: ['Therapists!A1:I'],
    fields: 'sheets(properties(sheetId,title,gridProperties(rowCount)))',
  });

  const therapistSheetProperties = therapistSheetPropertiesResponse.data.sheets[0].properties;
  const therapistLastRow = therapistSheetProperties.gridProperties.rowCount;

  // Fetch therapist data
  const therapistResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `Therapists!A1:I${therapistLastRow}`,
  });
  data.therapists = therapistResponse.data.values || [];
}


// Fetch data when server starts and start the server
fetchData()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to fetch data:', error);
  });

// DATA
app.get('/data', async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', req.url, new Date().toLocaleString());
  try {
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching data');
  }
});

app.get('/data/clients', async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', req.url, new Date().toLocaleString());

  try {
    const searchQuery = req.query.search || ''; // Get the search query from request
    console.log(searchQuery);

    let filteredClients = [];
    if (!data.clients || data.clients.length === 0) {
      filteredClients = [];
    } else {
      // Filter the rows based on the search query in columns 1 and 2
      filteredClients = data.clients.filter((row, index) => {
        // Always include the first row (index 0)
        if (index === 0) return true;

        // Check if row[1] or row[2] contains the searchQuery (case-insensitive)
        return row[1].toLowerCase().includes(searchQuery.toLowerCase()) || row[2].toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    res.json({
      clients: filteredClients,
      therapists: data.therapists,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching data');
  }
});

app.get('/data/therapists', async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', req.url, new Date().toLocaleString());

  try {
    const searchQuery = req.query.search || ''; // Get the search query from request
    console.log(searchQuery);

    let filteredTherapists = [];
    if (!data.therapists || data.therapists.length === 0) {
      filteredTherapists = [];
    } else {
      // Filter the rows based on the search query in columns 1 and 2
      filteredTherapists = data.therapists.filter((row, index) => {
        // Always include the first row (index 0)
        if (index === 0) return true;

        // Check if row[1] or row[2] contains the searchQuery (case-insensitive)
        return row[1].toLowerCase().includes(searchQuery.toLowerCase()) || row[2].toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    res.json({
      clients: data.clients,
      therapists: filteredTherapists,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching data');
  }
});

app.get('/data/update', async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', req.url, new Date().toLocaleString());
  try {
    fetchData()
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching data');
  }
});