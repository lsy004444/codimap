const express = require('express'),
      path = require('path'),
      session = require('express-session'),
      dotenv = require('dotenv'),
      authRouter = require("./routes/auth"),
      mypageRouter = require("./routes/mypage"),
      app = express(),
      googleauthRouter = require('./routes/googleauth'),
      kakaoauthRouter = require('./routes/kakaoauth'),
      reportRouter = require('./routes/reports');

dotenv.config();

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static('public'));
app.use(express.json());            
app.use(express.urlencoded({ extended: true })); 

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
app.use('/api/auth',googleauthRouter);
app.use('/api/auth', kakaoauthRouter);
app.use("/api/mypage", mypageRouter);
app.use('/api/reports',reportRouter);

const outfitRouter = require('./routes/outfit');
app.use('/api/outfit', outfitRouter);


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'map.html'));
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
    // 로그인 하지 않은 사람이 마이페이지에 들어가면 로그인으로 보내짐
    if(!req.session.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'views', 'mypage.html'));
})

app.get('/delete_account', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'delete_account.html'));
})
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
})

app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'upload.html'));
})
app.get('/feed', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'feed.html'));
})

const feedRouter = require("./routes/feed");
app.use("/api/feed", feedRouter);

// regions.js 
const regionsRouter = require('./routes/regions');
app.use('/api/regions', regionsRouter);

app.listen(80, () => console.log('✅ 서버 가동 중: http://localhost'));

