const express = require('express');
const bodyParser = require('body-parser');
const {Spanner} = require('@google-cloud/spanner');

function handleAccountCreated(event) {
  // Implement your business logic here
  console.log(`Account created: ${event.id} with name ${event.name}`);
}

const app = express();

const spanner = new Spanner();
const instance = spanner.instance('eventstore');
const database = instance.database('events');

app.use(bodyParser.json());

app.get('/', async (req, res) => {
  const query = {
    sql: "SELECT 1",
  };
  const [rows] = await database.run(query);
  res.send(`Hello from App Engine! ${JSON.stringify(rows[0])}`);
});

app.post('/accounts', async (req, res) => {
  const {name} = req.body;
  if(!name) {
    res.status(400).send("Name is required");
    return;
  }

  // Create and save the event
  const eventId = "your-event-id-generation-logic";
  const aggregateId = "your-aggregate-id-generation-logic";
  const eventType = "AccountCreated";
  const eventData = JSON.stringify({ name });
  const createdAt = new Date().toISOString();

  await database.run({
    sql: `
      INSERT INTO event_store (id, aggregate_id, type, data, created_at)
      VALUES (@id, @aggregateId, @type, @data, @createdAt)
    `,
    params: { id: eventId, aggregateId, type: eventType, data: eventData, createdAt },
  });

  // Call the event handler
  await handleAccountCreated(JSON.parse(eventData));

  res.status(201).send({ id: aggregateId, name });
})

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
