const fetch = require('node-fetch');
const { createClient } = require('@vercel/postgres');
const { put } = require('@vercel/blob');

const postgresUrl = process.env.POSTGRES_URL;
const postgresClient = createClient({ connectionString: postgresUrl });
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

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
          const fileName = `image-${url.split('/').pop()}.${fileExtension}`;
          const blobResponse = await put(fileName, buffer, {
            access: 'public',
            token: blobToken
          });

          const blobUrl = blobResponse.url;
          const prompt = url.split('/').pop();

          await postgresClient.sql`
            INSERT INTO images (url, blob_url, prompt)
            VALUES (${url}, ${blobUrl}, ${prompt})
          `;

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
