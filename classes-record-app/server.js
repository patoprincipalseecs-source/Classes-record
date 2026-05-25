const http = require('http');
const url = require('url');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PORT = process.env.PORT || 3000;

const json = (res, status, data) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
};

async function handleApi(method, pathname, req, res) {
  if (method === 'OPTIONS') {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' });
    res.end();
    return;
  }

  // Parse body for POST requests
  let body = {};
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try {
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch(e) {}
  }

  // API Routes
  if (method === 'GET' && pathname === '/api/schedules/public') {
    try {
      const result = await db.query(`SELECT id, name, 'Admin' as user_id, start_date, end_date FROM schedules WHERE is_public = true ORDER BY created_at DESC`);
      json(res, 200, result.rows);
    } catch(e) { json(res, 200, []); }
    return;
  }

  if (method === 'POST' && pathname === '/api/student-portal/login') {
    const { username, password } = body;
    try {
      const r = await db.query(`SELECT * FROM student_accounts WHERE username=$1 LIMIT 1`, [username]);
      if (!r.rows.length) return json(res, 200, { success: false, message: "Username not found" });
      if (r.rows[0].password !== password) return json(res, 200, { success: false, message: "Incorrect password" });
      json(res, 200, { success: true, studentName: r.rows[0].student_name, rollNo: r.rows[0].roll_no, className: r.rows[0].class_name, scheduleId: r.rows[0].schedule_id });
    } catch(e) { json(res, 500, { error: e.message }); }
    return;
  }

  if (pathname === '/health' || pathname === '/ping') {
    json(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
    return;
  }

  json(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url || '/', true);
  const pathname = parsedUrl.pathname;
  
  if (pathname.startsWith('/api/')) {
    await handleApi(req.method, pathname, req, res);
    return;
  }
  
  json(res, 404, { error: 'Not found' });
});

db.connect()
  .then(() => {
    console.log('✅ Connected to Neon database');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running in MOCK mode on port ${PORT}`);
    });
  });
