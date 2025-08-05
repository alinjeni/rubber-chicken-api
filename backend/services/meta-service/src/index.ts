import express, {Application} from 'express';
import routes from './routes';
import cors from 'cors';

const app : Application = express();
const PORT: Number = Number(process.env.PORT) || 3002;

app.use(cors());
app.use(express.json());
app.use('/api/meta', routes);

app.listen(PORT, () => {
  console.log(`Meta Service running on port ${PORT}`);
});
