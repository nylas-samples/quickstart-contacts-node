import "dotenv/config";
import express from "express";
import Nylas from "nylas";

const config = {
  clientId: process.env.NYLAS_CLIENT_ID,
  callbackUri: "http://localhost:3000/oauth/exchange",
  apiKey: process.env.NYLAS_API_KEY,
  apiUri: process.env.NYLAS_API_URI,
};

const nylas = new Nylas({
  apiKey: config.apiKey,
  apiUri: config.apiUri, // "https://api.us.nylas.com" or "https://api.eu.nylas.com"
});

const app = express();
const port = 3000;

// start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// route to initialize authentication
app.get("/nylas/auth", (req, res) => {
  const authUrl = nylas.auth.urlForOAuth2({
    clientId: config.clientId,
    redirectUri: config.callbackUri,
  });

  res.redirect(authUrl);
});

// auth callback route
app.get("/oauth/exchange", async (req, res) => {
  console.log("Received callback from Nylas");
  const code = req.query.code;

  if (!code) {
    res.status(400).send("No authorization code returned from Nylas");
    return;
  }

  const codeExchangePayload = {
    clientSecret: config.apiKey,
    clientId: config.clientId,
    redirectUri: config.callbackUri,
    code,
  };

  try {
    const response = await nylas.auth.exchangeCodeForToken(codeExchangePayload);
    const { grantId } = response;

    // NB: This stores in RAM
    // In a real app you would store this in a database, associated with a user
    process.env.USER_GRANT_ID = grantId;

    res.json({ message: "OAuth2 flow completed successfully for grant ID: " + grantId });
  } catch (error) {
    res.status(500).send("Failed to exchange authorization code for token");
  }
});

// route to create contact
app.get("/nylas/create-contact", async (req, res) => {
  try {
    const contact = await nylas.contacts.create({
      identifier: process.env.USER_GRANT_ID,
      requestBody: {
        givenName: "My",
        middleName: "Nylas",
        surname: "Friend",
        notes: "Make sure to keep in touch!",
        emails: [{type: 'work', email: 'swag@example.com'}],
        phoneNumbers: [{type: 'work', number: '(555) 555-5555'}],
        webPages: [{type: 'other', url: 'nylas.com'}]
      }
    })

    console.log('Contact:', JSON.stringify(contact))
    res.json(contact);
  } catch (error) {
    console.error('Error to create contact:', error)
    res.status(500).send("Failed to create contact");
  }
});