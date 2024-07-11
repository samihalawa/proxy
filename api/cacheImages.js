const fetch = require('node-fetch');
const { Client } = require('pg');
const { put } = require('@vercel/blob');

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
      // Adjusted the URL to fetch from the correct endpoint
      const imageUrl = `https://image.pollinations.ai/prompt/${url}`;
      const response = await fetch(imageUrl);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
          const buffer = await response.buffer();
          const fileExtension = contentType.split('/')[1];
          const fileName = `image-${url.split('/').pop().split('.')[0]}.${fileExtension}`;
          const blob = await put(fileName, buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
          });

          const blobUrl = blob.url;
          await pgClient.query(
            'INSERT INTO images (url, blob_url) VALUES ($1, $2)',
            [imageUrl, blobUrl]
          );

          results.push({ url: imageUrl, blobUrl });
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

  res.status(200).json({ cachedUrls: results });
};
