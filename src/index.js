const express = require('express');
const bodyParser = require('body-parser');
const {Spanner} = require('@google-cloud/spanner');
const {v4} = require('uuid');

const app = express();

const spanner = new Spanner();
const instance = spanner.instance('eventstore');
const database = instance.database('events');

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

  // Create and save the event
  const eventId = v4();
  const aggregateId = v4();
  const eventType = "AccountCreated";
  const eventData = JSON.stringify({ name });
  const createdAt = new Date().toISOString();

  try {
    const [rowCount] = await database.runTransaction(async (err, transaction) => {
      if (err || !transaction) {
        console.error('Error while starting transaction:', err);
        return;
      }

      const rowCount = await transaction.run({
        sql: `
          INSERT INTO event_store (id, aggregate_id, type, data, created_at)
          VALUES (@id, @aggregateId, @type, @data, @createdAt)
        `,
        params: { id: eventId, aggregateId, type: eventType, data: eventData, createdAt },
      });

      await transaction.commit();
      return rowCount;
    });

    // Call the event handler
    res.status(201).send({ id: aggregateId, name });
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
