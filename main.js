<<<<<<< HEAD
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
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'upload.html'));
})
app.get('/feed', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'feed.html'));
})



=======
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


>>>>>>> 870ae20 (프론트엔드 구현 완료)
app.listen(80, () => console.log('✅ 서버 가동 중: http://localhost'));