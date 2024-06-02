const { google } = require('googleapis');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const TOKEN_PATH = path.join(__dirname, '../token.json');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

const scopes = ['https://www.googleapis.com/auth/calendar.events'];

function getAuthUrl() {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  return url;
}

function getAccessToken(code) {
  return new Promise((resolve, reject) => {
    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        return reject(err);
      }
      oauth2Client.setCredentials(token);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      resolve(token);
    });
  });
}

function setCredentials() {
  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH);
    oauth2Client.setCredentials(JSON.parse(token));
  } else {
    console.log('Token not found, please authenticate.');
  }
}

module.exports = {
  getAuthUrl,
  getAccessToken,
  setCredentials,
  oauth2Client,
};
