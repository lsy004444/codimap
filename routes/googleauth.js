const axios = require('axios');
const express = require('express');
const pool = require('../config/db');
const crypto = require('crypto');
const { requireLogin } = require('../middleware/authMiddleware');
const router = express.Router();


// 구글 로그인
router.get('/google',(req, res) => {

    // console.log("CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
    // console.log("REDIRECT:", process.env.GOOGLE_REDIRECT_URI);
    req.session.socialAuthFrom = req.query.from;

    const googleAuthURL =`https://accounts.google.com/o/oauth2/v2/auth`
    + `?client_id=${process.env.GOOGLE_CLIENT_ID}`
    + `&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}`
    + `&response_type=code`
    + `&scope=openid email profile`
    + `&prompt=select_account`;

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

        if(socialRows.length === 0) {
            // 로그인 화면에서 미가입 google 계정으로 로그인을 시도할 경우
            if(req.session.socialAuthFrom === 'login') {
                delete req.session.pendingSocialSignup;
                delete req.session.socialAuthFrom;

                return req.session.save((err) => {
                if(err) {
                    console.error('소셜 회원가입 세션 저장 오류:' ,err);
                    return res.status(500).send('회원가입 정보 저장 중 오류가 발생했습니다.');
                }
                res.redirect('/signup');
                //res.redirect('/signup?social=true');
            });


            }
        
        
        // // 소셜 계정 가입 후 아이디를 받고난 후 로그인에 성공하게 하기 위한 방식임
        // if(socialRows.length === 0) {
        //     // 신규 소셜 계정 가입자-USERS에는 아직 저장 X, 회원가입 정보를 세션에 임시로 저장
        //     req.session.pendingSocialSignup = {
        //         provider: provider,
        //         providerUserId: String(providerUserId),
        //         name: googleUser.name,
        //         email: googleUser.email
        //     };


        // 기존 회원
        //const userId = socialRows[0].USER_ID;

        // 이 방식은 소셜 로그인 후 바로 users 테이블에 회원 정보가 들어감
        // let userId;

        // if(socialRows.length > 0) {
        //     // 기존 회원
        //     userId = socialRows[0].USER_ID;
        // } else {
        //     // 신규 회원 생성
        //     const [userResult] = await pool.query(
        //         `INSERT INTO USERS
        //         (
        //             ID,
        //             NAME,
        //             EMAIL,
        //             PASSWORD
        //         )
        //         VALUES(?,?,?,?)
        //         `,
        //         [
        //             `google_${providerUserId}`,
        //             googleUser.name,
        //             googleUser.email,
        //             null
        //         ]
        //     );
        //     userId = userResult.insertId;

        //     // 소셜 계정 연결
        //     await pool.query(
        //         `
        //         INSERT INTO USER_SOCIAL_ACCOUNTS
        //         (
        //             USER_ID,
        //             PROVIDER,
        //             PROVIDER_USER_ID
        //         )
        //             VALUES(?,?,?)
        //         `,
        //         [
        //             userId,provider,providerUserId
        //         ]
        //     );
        // }

         // 회원가입 페이지에서 소셜 가입 시도
    if(req.session.socialAuthFrom === 'signup') {
        req.session.pendingSocialSignup = {
            provider,
            providerUserId: String(providerUserId),
            name: googleUser.name,
            email: googleUser.email
        };

        delete req.session.socialAuthFrom;

        return req.session.save((err) => {
            if(err) {
                console.error('소셜 회원가입 세션 저장 오류:', err);
                return res.status(500).send('회원가입 정보 저장 중 오류가 발생했습니다.');
            }

            return res.redirect('/signup');
        });
    }

    return res.redirect('/signup');
}



        // 이전 소셜 회원가입 정보가 남아있다면 제거
        delete req.session.pendingSocialSignup;
        delete req.session.socialAuthFrom;

        // 여기부터는 "이미 가입된 소셜 회원"만 내려옴
        const userId = socialRows[0].USER_ID;
        
        // 세션에 넣을 사용자 정보 조회
        const[userRows] = await pool.query(
            `
            SELECT USER_ID, ID, NAME, EMAIL, STATUS, SUSPENDED_UNTIL
            FROM USERS
            WHERE USER_ID = ?
            `,
            [userId]
        );

        if(userRows.length === 0) {
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
            await pool.query(
                `UPDATE USERS SET STATUS = 'ACTIVE',
                SUSPENDED_UNTIL = NULL
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
        
        res.redirect('/');
    } catch(err) {
        console.error(err);
        res.status(500).send('Google 로그인 실패');
    }
});

router.get('/google/delete', requireLogin, async(req, res) => {
    try {
        const userId = req.session.user.userId;

        // 현재 회원이 실제 google 회원인지 확인
        const [socialRows] = await pool.query(
            `SELECT PROVIDER_USER_ID
            FROM USER_SOCIAL_ACCOUNTS
            WHERE USER_ID = ? AND PROVIDER = 'GOOGLE'`,[userId]
        );

        if(socialRows.length === 0) {
            return res.status(400).send('Google 로그인 계정이 아닙니다.');
        }

        // 환경변수 확인
        if(!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_AUTH_URL || !process.env.GOOGLE_DELETE_REDIRECT_URI) {
            console.error('Google 탈퇴 환경변수가 설정되지 않았습니다.', {
                cliendId: !!process.env.GOOGLE_CLIENT_ID,
                authUrl: !!process.env.GOOGLE_AUTH_URL,
                deleteRedirectUri: !!process.env.GOOGLE_DELETE_REDIRECT_URI
            });

            return res.status(500).send('Google 탈퇴 설정에 오류가 있습니다.');
        }

        const state = crypto.randomBytes(32).toString('hex');

        req.session.googleDeleteState = state;

        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: process.env.GOOGLE_DELETE_REDIRECT_URI,
            response_type: 'code',
            scope: 'openid email profile',
            state: state,
            prompt: 'select_account'
        });

        res.redirect(`${process.env.GOOGLE_AUTH_URL}?${params.toString()}`);
    } catch(error) {
        console.error('Google 탈퇴 인증 시작 오류:', error);

        return res.status(500).send('Google 탈퇴 인증 중 오류가 발생했습니다.');
    }
});

router.get('/google/delete/callback', async(req, res) => {
    try {
        const { code, state, error } = req.query;

        // 사용자가 google 인증을 취소한 경우
        if(error) {
            return res.redirect('/delete_account.html');
        }

        // 세션 확인
        if(!req.session.user) {
            return res.status(401).send('로그인이 필요합니다.');
        }

        // state 검사
        if(!state || !req.session.googleDeleteState || state !== req.session.googleDeleteState) {
            return res.status(403).send('잘못된 Google 인증 요청입니다.');
        }

        // 한 번 사용한 state 삭제
        delete req.session.googleDeleteState;

        if(!code) {
            return res.status(400).send('Google 인증 코드가 없습니다.');
        }

        const userId = req.session.user.userId;

        // codimap에 연결되어 있는 google 계정 조회
        const [socialRows] = await pool.query(
            `SELECT PROVIDER_USER_ID
            FROM USER_SOCIAL_ACCOUNTS
            WHERE USER_ID = ? AND PROVIDER = 'GOOGLE'`,[userId]
        );

        if(socialRows.length === 0) {
            return res.status(400).send('연결된 Google 계정을 찾을 수 없습니다.');
        }

        const savedGoogleUserId = String(socialRows[0].PROVIDER_USER_ID);

        // 1. 인증 코드를 access token으로 교환
        const tokenResponse = await axios.post(
            process.env.GOOGLE_TOKEN_URL,
            new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri:process.env.GOOGLE_DELETE_REDIRECT_URI
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        const accessToken = tokenResponse.data.access_token;

        // 2. 방금 인증한 Google 사용자 확인
        const userResponse = await axios.get(process.env.GOOGLE_USERINFO_URL,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        const googleUser = userResponse.data;

        // 3. codimap에 연결횐 google 계정과 방금 인증한 google 계정이 같은지 확인
        if(String(googleUser.sub) !== savedGoogleUserId) {
            return res.status(403).send('현재 CODIMAP에 연결된 GOOGLE 계정과 다릅니다.');
        }

        // 4. Google OAuth 권한 해제
        await axios.post(process.env.GOOGLE_REVOKE_URL,
            new URLSearchParams({
                token: accessToken
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        // 5. codimap 회원 탈퇴 처리
        await pool.query(
            `UPDATE USERS
            SET STATUS = 'DELETED'
            WHERE USER_ID = ?`,[userId]
        );

        // 6. 세션 삭제
        req.session.destroy((sessionError) => {
            if(sessionError) {
                console.error('세션 삭제 오류:', sessionError);

                return res.status(500).send('회원탈퇴 후 로그아웃 처리에 실패했습니다.');
            }

            res.clearCookie('connect.sid');

            return res.redirect('/login');
        });
    } catch(error) {
        console.error('Google 회원탈퇴 오류:', error.response?.data || error);

        return res.status(500).send('Google 회원탈퇴 처리 중 오류가 발생했습니다.');
    }
});

module.exports = router;