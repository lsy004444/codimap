const express = require('express'),
      path = require('path'),
      session = require('express-session'),
      authRouter = require("./routes/auth"),
      app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static('public'));
app.use(express.json());            
app.use(express.urlencoded({ extended: true })); 

const outfitRouter = require('./routes/outfit');
app.use('/api/outfit', outfitRouter);

// 세션 설정
app.use(session({
    secret: 'codimap-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

app.use("/api/auth", authRouter);

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