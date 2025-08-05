import express, {Application} from 'express';
import routes from './routes';
import cors from 'cors';

const app : Application = express();
const PORT: Number = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());
app.use('/api/images', routes);

app.listen(PORT, () => {
  console.log(`Image Service running on port ${PORT}`);
});
