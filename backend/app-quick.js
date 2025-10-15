import express from 'express';
const app = express();
app.get('/api/health', (req, res) => res.json({ status: 'ok-quick' }));
app.listen(5050, () => console.log('Quick server on 5050'));
