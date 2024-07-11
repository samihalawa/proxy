const { IncomingForm } = require('formidable');
const { put } = require('@vercel/blob');
const fs = require('fs');

// Use Vercel Blob for storing the uploaded files
async function storeFile(file) {
    const buffer = fs.readFileSync(file.path);
    const fileName = file.name;
    const blob = await put(fileName, buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return {
        name: fileName,
        url: blob.url
    };
}

module.exports = (req, res) => {
    const form = new IncomingForm({ multiples: true });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            res.status(500).json({ error: 'Error parsing the files' });
            return;
        }

        const uploadedFiles = Array.isArray(files.files) ? files.files : [files.files];
        const results = [];

        for (const file of uploadedFiles) {
            try {
                const storedFile = await storeFile(file);
                results.push(storedFile);
            } catch (error) {
                console.error('Error storing file:', error);
                res.status(500).json({ error: 'Error storing file' });
                return;
            }
        }

        res.json({ files: results });
    });
};