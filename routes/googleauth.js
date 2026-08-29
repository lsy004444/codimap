const axios = require('axios');
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// 구글 로그인
router.get('/google',(req, res) => {

    // console.log("CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
    // console.log("REDIRECT:", process.env.GOOGLE_REDIRECT_URI);


    const googleAuthURL =`https://accounts.google.com/o/oauth2/v2/auth`
    + `?client_id=${process.env.GOOGLE_CLIENT_ID}`
    + `&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}`
    + `&response_type=code`
    + `&scope=openid email profile`;

    // console.log(googleAuthURL);

    res.redirect(googleAuthURL);
});

router.get('/google/callback', async(req, res) => {
    try {
        // google이 보내준 code받기
        const { code } = req.query;

        if(!code) {
            return res.status(400).send('인증 코드가 없습니다.');
        }

        // code->access token 교환
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token',
            {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.GOOGLE_REDIRECT_URI
            }
        );

        const accessToken = tokenResponse.data.access_token;

        // access token으로 사용자 정보 요청
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        const googleUser = userResponse.data;
        const provider = 'GOOGLE';
        const providerUserId = googleUser.sub;

        // 기존 소셜 계정 확인
        const [socialRows] = await pool.query(
            `SELECT USER_ID
            FROM USER_SOCIAL_ACCOUNTS
            WHERE PROVIDER = ?
            AND PROVIDER_USER_ID = ?`,
            [provider, providerUserId]
        );

        let userId;

        if(socialRows.length > 0) {
            // 기존 회원
            userId = socialRows[0].USER_ID;
        } else {
            // 신규 회원 생성
            const [userResult] = await pool.query(
                `INSERT INTO USERS
                (
                    ID,
                    NAME,
                    EMAIL,
                    PASSWORD
                )
                VALUES(?,?,?,?)
                `,
                [
                    `google_${providerUserId}`,
                    googleUser.name,
                    googleUser.email,
                    'SOCIAL_LOGIN'
                ]
            );
            userId = userResult.insertId;

            // 소셜 계정 연결
            await pool.query(
                `
                INSERT INTO USER_SOCIAL_ACCOUNTS
                (
                    USER_ID,
                    PROVIDER,
                    PROVIDER_USER_ID
                )
                    VALUES(?,?,?)
                `,
                [
                    userId,provider,providerUserId
                ]
            );
        }
        
        // 세션에 넣을 사용자 정보 조회
        const[userRows] = await pool.query(
            `
            SELECT USER_ID, ID, NAME, EMAIL
            FROM USERS
            WHERE USER_ID = ?
            `,
            [userId]
        );

        const user = userRows[0];

        // 세션 생성
         req.session.user = {
            userId: user.USER_ID,
            name: user.NAME,
            email: user.EMAIL,
            profileId: user.ID
        };
        
        res.redirect('/');
    } catch(err) {
        console.error(err);
        res.status(500).send('Google 로그인 실패');
    }
});

module.exports = router;