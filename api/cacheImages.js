const fetch = require('node-fetch');

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
        results.push(url);
      } else {
        console.error(`Failed to fetch ${url}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
    }
  }

  return res.status(200).json({ cachedUrls: results });
};
