import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL and Anon Key are required. Please check your credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/', (req, res) => {
  res.send('Health Data API is running!');
});

app.get('/api/health-data', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('health_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.status(200).json(data);

  } catch (err) {
    console.error('Error fetching data from Supabase:', err.message);
    res.status(500).json({ error: 'An error occurred while fetching data.' });
  }
});

const startServer = async () => {
  try {
    console.log('Attempting to connect to Supabase...');
    const { error } = await supabase
      .from('health_data')
      .select('id', { head: true, count: 'exact' });

    if (error) {
      throw error;
    }

    console.log('Successfully connected to Supabase.');

    app.listen(port, () => {
      console.log(`Server is listening at http://localhost:${port}`);
    });

  } catch (err) {
    console.error('Failed to connect to Supabase:', err.message);
    console.error('Please check your .env credentials and Supabase project status.');
    process.exit(1);
  }
};

startServer();