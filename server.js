import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toLocaleString()} - ${req.method} ${req.url}`);
    next();
});

// Initialize DB file if not exists
async function initDB() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        const defaultData = {
            users: {}, // Store user data keyed by userId
            sharedItems: []
        };
        await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
    }
}

// Get user data
app.get('/api/data', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(400).json({ error: 'Missing UserId' });

        const raw = await fs.readFile(DATA_FILE, 'utf-8');
        const db = JSON.parse(raw);

        // Safety check & Migration
        if (!db.users) db.users = {};
        if (!db.sharedItems && db.checkins) {
            // Migrate old data to a default user or just initialize
            db.sharedItems = db.sharedItems || [];
        }

        const userData = db.users[userId] || { checkins: [], streak: 0, lastCheckin: null };
        res.json({
            ...userData,
            sharedItems: db.sharedItems || []
        });
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Update data
app.post('/api/data', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(400).json({ error: 'Missing UserId' });

        const clientData = req.body;
        const raw = await fs.readFile(DATA_FILE, 'utf-8');
        const db = JSON.parse(raw);

        if (!db.users) db.users = {};

        // Update user data (excluding global fields)
        const { sharedItems, ...userFields } = clientData;
        db.users[userId] = userFields;
        if (sharedItems) db.sharedItems = sharedItems;

        await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2));
        res.json({ message: 'Saved successfully' });
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Fallback to index.html for SPA
app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Backend server running at http://0.0.0.0:${PORT}`);
    });
});
