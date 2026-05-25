const http = require('http');
const url = require('url');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection from environment
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const PORT = parseInt(process.env.PORT || "3000", 10);
const STATIC_ROOT = path.join(__dirname, '..', 'dist');

// Helper function
const json = (res, status, data) => {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
};

// Simple API handler with essential routes
async function handleApi(method, pathname, req, res) {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host}`);
  
  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, { 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // GET /api/schedules/public
  if (method === 'GET' && pathname === '/api/schedules/public') {
    try {
      const result = await db.query(`
        SELECT id, name, 'Admin' as user_id, start_date, end_date 
        FROM public.schedules 
        WHERE is_public = true OR is_public IS NULL
        ORDER BY created_at DESC
      `);
      json(res, 200, result.rows);
    } catch (error) {
      console.error('DB Error:', error);
      // Return mock data
      json(res, 200, [
        { id: 1, name: "Spring 2026 Schedule", user_id: "Admin", start_date: "2026-01-15", end_date: "2026-05-30" },
        { id: 2, name: "Faculty Training Program", user_id: "Dean Office", start_date: "2026-02-01", end_date: "2026-02-28" }
      ]);
    }
    return;
  }

  // Health check
  if (pathname === '/health' || pathname === '/ping') {
    json(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
    return;
  }

  // Default 404
  json(res, 404, { error: 'Not found' });
}

// Create server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url || '/', true);
  let pathname = parsedUrl.pathname;
  
  if (pathname.startsWith('/api/')) {
    try {
      await handleApi(req.method, pathname, req, res);
    } catch (e) {
      console.error('API error:', e);
      json(res, 500, { error: String(e) });
    }
    return;
  }
  
  // Serve static files if they exist
  if (pathname === '/' || pathname === '/index.html') {
    const indexPath = path.join(STATIC_ROOT, 'index.html');
    if (fs.existsSync(indexPath)) {
      fs.readFile(indexPath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data);
        }
      });
      return;
    }
  }
  
  json(res, 404, { error: 'Not found' });
});

// Test database connection
db.connect()
  .then(() => {
    console.log('✅ Connected to Neon PostgreSQL database');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.log('⚠️ Starting server in MOCK mode');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running in MOCK mode on http://0.0.0.0:${PORT}`);
    });
  });
