const net = require('net');

const socket = net.createConnection({
  host: 'codimapdb-codimap.e.aivencloud.com',
  port: 18931,
  family: 4  // IPv4 강제
}, () => {
  console.log('✅ TCP 연결 성공');
  socket.end();
});

socket.on('error', (err) => {
  console.error('❌ TCP 연결 실패:', err.message);
});

socket.setTimeout(10000, () => {
  console.error('❌ 타임아웃');
  socket.destroy();
});