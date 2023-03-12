import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const port = process.env.PORT;

const app = express();

app.use(express.static('frontend/build'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
