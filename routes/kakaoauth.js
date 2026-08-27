const axios=require('axios');
const express=require('express');
const pool=require('../config/db');
const router=express.Router();

// 카카오 로그인
router.get('/kakao',(req, res) => {
    const kakaoAuthURL = 'https://kauth.kakao.com/oauth/authorize'
    +`?client_id=${process.env.KAKAO_CLIENT_ID}`
    +`&redirect_uri=${process.env.KAKAO_REDIRECT_URI}`
    +`&response_type=code`;

    res.redirect(kakaoAuthURL);
});

router.get('/kakao/callback', async(req, res) => {
    try {
        const { code } = req.query;

        // 인가 코드->access token
        const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token',null,
            {
                params: {
                    grant_type: 'authorization_code',
                    client_id: process.env.KAKAO_CLIENT_ID,
                    client_secret: process.env.KAKAO_CLIENT_SECRET,
                    redirect_uri: process.env.KAKAO_REDIRECT_URI,
                    code: code
                }
            }
        );

        const accessToken = tokenResponse.data.access_token;

        // 사용자 정보 요청
        const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        const kakaoUser = userResponse.data;
        const provider = 'KAKAO';
        const providerUserId = kakaoUser.id;

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
                    `kakao_${providerUserId}`,
                    kakaoUser.kakao_account.profile.nickname,
                    kakaoUser.kakao_account.email,
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
            SELECT USER_ID, ID, NAME, EMAIL, STATUS, SUSPENDED_UNTIL
            FROM USERS
            WHERE USER_ID = ?
            `,
            [userId]
        );
        
        if(userRows.length === 0 ) {
            return res.status(404).send('회원 정보를 찾을 수 없습니다.');
        }

        const user = userRows[0];

        // 탈퇴 회원
        if(user.STATUS === 'DELETED') {
            return res.status(403).send('탈퇴한 회원입니다.');
        }

        // 영구 정지 회원
        if(user.STATUS === 'BANNED') {
            return res.status(403).send('영구 정지된 계정입니다.');
        }

        // 기간 정지 회원
        if(user.STATUS === 'SUSPENDED') {
            if(user.SUSPENDED_UNTIL && new Date(user.SUSPENDED_UNTIL) > new Date()) {
                return res.status(403).send('현재 이용이 정지된 계정입니다.');
            }

            // 정지 기간이 끝났을 경우 자동 해제
            await pool.query(
                `UPDATE USERS SET STATUS = 'ACTIVE',
                SUSPENDED_UNTIL = null
                WHERE USER_ID = ?`,[userId]
            );
            user.STATUS = 'ACTIVE';
        }

        // 세션 생성
         req.session.user = {
            userId: user.USER_ID,
            name: user.NAME,
            email: user.EMAIL,
            profileId: user.ID
        };
        console.log(kakaoUser);
        res.redirect('/');
    } catch(err) {
        console.error(err.response?.data || err);
        res.status(500).send('카카오 로그인 실패');
    }
});

module.exports = router;