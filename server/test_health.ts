import server from './src/server';
import http from 'http';

async function checkHealth() {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const req = http.get('http://127.0.0.1:4000/api/health', (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log('STATUS CODE:', res.statusCode);
      console.log('HEALTH RESPONSE:', JSON.stringify(JSON.parse(data), null, 2));
      server.close(() => {
        console.log('Server closed gracefully');
        process.exit(0);
      });
    });
  });

  req.on('error', (err) => {
    console.error('Request error:', err);
    server.close();
    process.exit(1);
  });
}

checkHealth();
