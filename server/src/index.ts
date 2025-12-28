import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileRoutes from './routes/files';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Trust Proxy (Crucial for Railway/Heroku/Vercel)
// This ensures Express respects the headers set by the upstream load balancer (SSL termination, etc.)
app.set('trust proxy', 1);

// Configure CORS for production
const allowedOrigins = [
  'http://localhost:5173', // Local development
  'http://localhost:3000', // Local backend test
  'https://doc-safe.vercel.app', // Production Frontend
  'https://docsafe-production.up.railway.app' // Self-reference
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Debug logging for production to trace CORS issues
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[CORS] Incoming Origin: ${origin || 'NO_ORIGIN'}`);
    }

    // Allow requests with no origin (like mobile apps, curl requests, or server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.warn(`[CORS] Blocked Origin: ${origin}`);
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// 2. Apply CORS middleware globally BEFORE any routes
app.use(cors(corsOptions));

// 3. Explicitly handle preflight OPTIONS requests
// This ensures OPTIONS requests get a 200 OK and proper headers immediately
app.options(/.*/, cors(corsOptions));

app.use(express.json());

// Root route for health check and simple verification
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'DocSafe Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/files', fileRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
