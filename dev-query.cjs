import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('data/database.sqlite');
db.all("SELECT id, direction, content, createdAt FROM Messages ORDER BY createdAt DESC LIMIT 15", (err, rows) => {
    console.log("MESSAGES:", rows);
});
db.all("SELECT event, direction, sender, content, payload FROM WebhookLogs ORDER BY timestamp DESC LIMIT 6", (err, rows) => {
    console.log("WEBHOOKS:", rows);
});
