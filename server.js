import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai'

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash"});

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

app.get('/api/emotions-log', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('emotions_log')
      .select('*')
      .order('id', { ascending: false }) // Get the latest entry first
      .limit(1); // We only need the most recent one

    if (error) throw error;

    res.status(200).json(data ? data[0] : null);

  } catch (err) {
    console.error('Error fetching emotion data from Supabase:', err.message);
    res.status(500).json({ error: 'An error occurred while fetching emotion data.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, healthData } = req.body;

    if (!message || !healthData) {
      return res.status(400).json({ error: 'Message and healthData are required.' });
    }

    // Create a detailed prompt for the AI
    const prompt = `You are a helpful AI health assistant.
      Based on the user's current health data and their question, provide a helpful and concise response.
      
      Current Health Data:
      - Heart Rate: ${healthData.heartRate} BPM
      - SpO2: ${healthData.spO2}%
      - Body Temperature: ${healthData.bodyTemp}°C

      User's Question: "${message}"
      
      Your Response:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ reply: text });

  } catch (error) {
    console.error('Error with Gemini API:', error);
    res.status(500).json({ error: 'Failed to get a response from the AI assistant.' });
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