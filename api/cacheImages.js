const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const { put } = require('@vercel/blob');

const supabaseUrl = 'https://wqhyfotqobtrtxsjmkmr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxaHlmb3Rxb2J0cnR4c2pta21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTcwMTcyMjIsImV4cCI6MjAzMjU5MzIyMn0.g23QzTWZG5f2UPbXys_1LOqI0tsAvqOOSO5M4XeRfYQ';
const supabase = createClient(supabaseUrl, supabaseKey);

const pgClient = new Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});
pgClient.connect();

module.exports = async (req, res) => {
  const { urls } = req.query;
  if (!urls) {
    return res.status(400).json({ error: 'urls parameter is required' });
  }

  const urlList = urls.split(',');
  const results = [];

  for (const url of urlList) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
          const buffer = await response.buffer();
          const fileExtension = contentType.split('/')[1];
          const prompt = url.split('/').pop().split('.')[0];
          const fileName = `image-${prompt}.${fileExtension}`;
          const blobResponse = await put(fileName, buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
          });

          const blobUrl = blobResponse.url;

          await pgClient.query(
            'INSERT INTO images (url, blob_url, prompt) VALUES ($1, $2, $3)',
            [url, blobUrl, prompt]
          );

          results.push({ url, blobUrl, prompt });
        } else {
          console.error(`URL is not an image: ${url}`);
        }
      } else {
        console.error(`Failed to fetch ${url}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
    }
  }

  return res.status(200).json({ cachedUrls: results });
};
