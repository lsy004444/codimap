const express = require('express'),
      path = require('path'),
      session = require('express-session'),
      authRouter = require("./routes/auth"),
      mypageRouter = require("./routes/mypage"),
      app = express();

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
app.use("/api/mypage", mypageRouter);

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
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
})

app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'upload.html'));
})
app.get('/feed', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'feed.html'));
})
app.get('/ai-chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/ai-chat.html'));
});
// TODO: 이 페이지로 이동하는 진입 버튼이 아직 없음 (주소 직접 입력만 가능).
//       관리자에게만 보이도록 노출 — 상세는 routes/admin.js 의 /check 주석 참고.
app.get('/admin', (req, res) => {
    // 로그인하지 않은 사용자는 로그인으로, 관리자 여부는 페이지 내부에서 재확인
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

const feedRouter = require("./routes/feed");
app.use("/api/feed", feedRouter);

const adminRouter = require("./routes/admin");
app.use("/api/admin", adminRouter);

// regions.js 
const regionsRouter = require('./routes/regions');
app.use('/api/regions', regionsRouter);

//ai.js
const aiRouter = require('./routes/ai');
app.use('/api/ai', aiRouter);

app.listen(80, () => console.log('✅ 서버 가동 중: http://localhost'));

