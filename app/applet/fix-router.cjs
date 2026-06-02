const fs = require('fs');
let code = fs.readFileSync('src/lib/atendimento-router.ts', 'utf8');
code = code.replace(
  "if (rawPayload && String(rawPayload.event).toLowerCase().includes('messages.upsert') || String(rawPayload.event).toLowerCase().includes('messages')) {",
  "if (rawPayload && String(rawPayload.event).toLowerCase().includes('messages')) {"
);
fs.writeFileSync('src/lib/atendimento-router.ts', code);
