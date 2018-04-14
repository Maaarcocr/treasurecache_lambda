const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const AWS = require('aws-sdk');

const CHALLENGES_TABLE = process.env.CHALLENGES_TABLE;

const IS_OFFLINE = process.env.IS_OFFLINE;
let dynamoDb;
if (IS_OFFLINE === 'true') {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:8000'
  })
  console.log(dynamoDb);
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
};

const postURL = IS_OFFLINE ? '"/challenges"' : '"/dev/challenges"';

const createChallengeFormHTML = `
<html>
<head>
  <title>
    Create a challenge
  </title>
</head>
<body>
</body>
  <form action=${ postURL } method="post">
    <label for="ChallengeName">The challenge Name: </label>
    <input id="ChallengeName" type="text" name="ChallengeName" required />
    <br/>

    <label for="RiddleText">The riddle: </label>
    <input id="RiddleText" type="text" name="RiddleText" required />
    <br/>

    <label for="BeaconIDsRaw">The beacon IDs (separated by comma): </label>
    <input id="BeaconIDsRaw" type="text" name="BeaconIDsRaw" required />
    <br/>

    <button type="submit">Submit</button>
  </form>
</html>
`

// app.use(bodyParser.json({ strict: false }));
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', function (req, res) {
  res.send(createChallengeFormHTML)
})

// Get User endpoint
app.get('/challenges', function (req, res) {
  const params = {
    TableName: CHALLENGES_TABLE,
  }

  dynamoDb.scan(params, (error, data) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not get challenges' });
      return;
    }
    if (data.Items.length > 0) {
      res.json(data.Items);
    } else {
      res.status(404).json({ error: "No Challenges" });
    }
  });
})

// Create User endpoint
app.post('/challenges', function (req, res) {
  const { ChallengeName, RiddleText, BeaconIDsRaw } = req.body;
  if (typeof ChallengeName !== 'string') {
    res.status(400).json({ error: '"ChallengeName" must be a string' });
    return;
  } else if (typeof RiddleText !== 'string') {
    res.status(400).json({ error: '"RiddleText" must be a string' });
    return;
  } else if (typeof BeaconIDsRaw !== 'string') {
    console.log("BEACONS: ", BeaconIDsRaw)
    res.status(400).json({ error: '"BeaconsID" must be an array of strings' });
    return;
  }

  const BeaconIDsRawNoWS = BeaconIDsRaw.replace(/\s/g,'')
  const BeaconIDs = BeaconIDsRawNoWS.split(",") 

  const params = {
    TableName: CHALLENGES_TABLE,
    Item: {
      ChallengeName: ChallengeName,
      RiddleText: RiddleText,
      BeaconIDs: BeaconIDs,
    },
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not create user' });
    }
    res.json({ success: true });
  });
})

module.exports.handler = serverless(app);