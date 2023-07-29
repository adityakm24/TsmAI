import Busboy from 'busboy';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { Storage } from '@google-cloud/storage';
import { SpeechClient } from '@google-cloud/speech';

const speechClient = new SpeechClient({
    credentials: {
        private_key: process.env.GOOGLE_PRIVATE_KEY,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
    },
});

const storage = new Storage({
    credentials: {
        private_key: process.env.GOOGLE_PRIVATE_KEY,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
    },
});

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async (req, res) => {
    try {
        if (req.method === 'POST') {
            const busboy = new Busboy({ headers: req.headers });
            const tmpdir = path.join(os.tmpdir(), 'uploads');

            if (!fs.existsSync(tmpdir)) {
                fs.mkdirSync(tmpdir);
            }

            let audioFilePath;
            let audioFileData;

            busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
                if (fieldname === 'audio') {
                    audioFilePath = path.join(tmpdir, filename);
                    audioFileData = [];

                    file.on('data', (data) => {
                        audioFileData.push(data);
                    });

                    file.on('end', () => {
                        const buffer = Buffer.concat(audioFileData);
                        fs.writeFileSync(audioFilePath, buffer);
                    });
                } else {
                    file.resume();
                }
            });

            busboy.on('finish', async () => {
                if (!audioFilePath) {
                    return res.status(400).json({ error: 'No audio file uploaded' });
                }

                try {
                    // Upload audio file to Google Cloud Storage
                    const bucketName = 'users_drive_storage'; // Replace with your GCS bucket name
                    const bucket = storage.bucket(bucketName);
                    const gcsFilePath = `audio/${Date.now()}_${path.basename(audioFilePath)}`;
                    await bucket.upload(audioFilePath, {
                        destination: gcsFilePath,
                    });

                    // Delete the temporary uploaded file
                    fs.unlinkSync(audioFilePath);

                    // Transcribe the audio using Speech-to-Text API
                    const [response] = await speechClient.recognize({
                        config: {
                            encoding: 'MP3',
                            sampleRateHertz: 8000,
                            languageCode: 'ml-IN',
                        },
                        audio: {
                            uri: `gs://${bucketName}/${gcsFilePath}`,
                        },
                    });

                    const transcription = response.results
                        .map((result) => result.alternatives[0].transcript)
                        .join(' ');

                    res.json({ transcript: transcription });
                } catch (error) {
                    console.error('Error processing audio:', error);
                    res.status(500).json({ error: 'Error processing audio' });
                }
            });

            req.pipe(busboy);
        } else {
            res.status(405).end(); // Method Not Allowed
        }
    } catch (error) {
        console.error('Error processing audio:', error);
        res.status(500).json({ error: 'Error processing audio' });
    }
};
