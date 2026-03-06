const http = require('http');

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.status, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function get(url, cookie) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'GET',
      headers: { 'Cookie': cookie }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.status, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  try {
    const login = await post('http://localhost:3001/api/auth/login', { code: '102203009', password: '102203009' });
    console.log('Login Status:', login.status || 200); // http.request res doesn't have .status, it's .statusCode

    const setCookie = login.headers['set-cookie'] ? login.headers['set-cookie'][0] : null;
    console.log('Set-Cookie:', setCookie);

    if (setCookie) {
      const dashboard = await get('http://localhost:3001/api/dashboard', setCookie);
      const data = JSON.parse(dashboard.body);
      console.log('Dashboard Data Received');
      console.log('Agents Count:', data.agents ? data.agents.length : 'N/A');
      if (data.agents && data.agents.length > 0) {
        console.log('First Agent:', data.agents[0].name, data.agents[0].branch);
      } else {
        console.log('Response:', JSON.stringify(data, null, 2));
      }
    }
  } catch (e) {
    console.error('Test error:', e.message);
  }
}

test();
