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

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
})
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'))
})
app.get('/find_pw', (req, res)=> {
    res.sendFile(path.join(__dirname, 'views', 'find_pw.html'));
})
app.get('/modify', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'modify.html'));
})
app.get('/mypage', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'mypage.html'));
})
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
})
app.get('/map', (req , res) => {
    res.sendFile(path.join(__dirname, 'views', 'map.html'));
})
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'upload.html'));
})
app.get('/feed', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'feed.html'));
})

const feedRouter = require("./routes/feed");
app.use("/api/feed", feedRouter);

app.listen(80, () => console.log('✅ 서버 가동 중: http://localhost'));

// regions.js 
const regionsRouter = require('./routes/regions');
app.use('/api/regions', regionsRouter);