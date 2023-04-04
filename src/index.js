// @ts-check
const express = require('express');
const bodyParser = require('body-parser');
const {PubSub} = require('@google-cloud/pubsub');

const pubsub = new PubSub();
const topicName = "account-created";

const app = express();
app.use(bodyParser.json());
app.get('/', async (req, res) => {
  res.send(`Hello from App Engine!`);
});
app.post('/accounts', async (req, res) => {
  const {name} = req.body;
  if(!name) {
    res.status(400).send("Name is required");
    return;
  }

  const message = {
    type: "AccountCreated",
    data: { name }
  }
  const data = Buffer.from(JSON.stringify(message));

  try {
    const messageId = await pubsub.topic(topicName).publishMessage({data}, (err, messageId) => {
      console.log({err, messageId});
    });

    // Call the event handler
    res.status(201).send({ id: messageId, name });
  } catch (err) {
    console.error('Error while executing transaction:', err);
    res.status(500).send('Error occurred while saving the event');
  }
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
