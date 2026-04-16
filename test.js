const http = require('http');
http.get('http://127.0.0.1:3000/', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data.substring(0, 1000)));
});
