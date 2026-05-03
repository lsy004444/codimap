const express = require('express'),
      path = require('path'),
      app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send(
        `<div style="text-align:center; margin-top:50px;">
           <h1> 80번 포트 실행중 </h1>
        </div>`
    );
});

app.get('/map', (req , res) => {
    res.sendFile(path.join(__dirname, 'views', 'map.html'));
})


app.listen(80, () => console.log('✅ 서버 가동 중: http://localhost'));