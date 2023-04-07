import express from 'express';
import dotenv from 'dotenv';
import { apiRouter } from './api';
dotenv.config();

const port = process.env.PORT;

const app = express();

app.use(express.static('frontend/build'));

app.use('/api', apiRouter);

// nothing else matches, so send index.html (react will handle the rest)
app.use('*', (req, res) => {
  res.sendFile('index.html', { root: 'frontend/build' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
