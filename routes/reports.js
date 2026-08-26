const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/authMiddleware');
const pool = require('../config/db');

// 로그인 확인 미들웨어
// function requireLogin(req, res, next) {
//     console.log("========== requireLogin ==========");
//     console.log("method:", req.method);
//     console.log("url:", req.originalUrl);
//     console.log("sessionID:", req.sessionID);
//     console.log("session:", req.session);
//     console.log("session.user:", req.session?.user);

//     if(!req.session.user) {
//         return res.status(401).json({
//             success: false,
//             message: "로그인이 필요합니다."
//         });
//     }
//     next();
// }

router.post('/', requireLogin, async(req, res) => {
    try {
        // 신고자는 클라이언트에서 받지 않고 세션에서 가져옴->why?
        const reporterId = req.session.user.userId;

        const { reportedId, postId=null, commentId=null, reason } = req.body;

        // 필수값 확인
        if(!reportedId) {
            return res.status(400).json({
                success: false,
                message: '신고 대상이 필요합니다.'
            });
        }

        if(!reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: '신고 사유를 입력해주세요.'
            });
        }

        if(Number(reporterId) === Number(reportedId)) {
            return res.status(400).json({
                success: false,
                message: '자기 자신은 신고할 수 없습니다.'
            });
        }

        // 신고 대상 유저가 존재하는지 조회
        const [users] = await pool.query(
            `SELECT USER_ID
            FROM USERS
            WHERE USER_ID = ?`,
            [reportedId]
        );

        if(users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '존재하지 않는 사용자입니다.'
            });
        }

        // 중복 신고 방지
        const [existingReports] = await pool.query(
            `SELECT REPORT_ID
            FROM REPORT
            WHERE REPORTER_ID = ?
            AND REPORTED_ID = ?
            AND (POST_ID <=> ?)
            AND (COMMENT_ID <=> ?)
            AND STATUS = 'PENDING'`,
            [ reporterId, reportedId, postId, commentId ]
        );

        if(existingReports.length > 0) {
            return res.status(409).json({
                success: false,
                message: '이미 신고한 사용자입니다.'
            });
        }

        // 신고 저장
        const [result] = await pool.query(
            `INSERT INTO REPORT (REPORTER_ID, REPORTED_ID, POST_ID, COMMENT_ID, REASON, STATUS, CREATED_DATE)
            VALUES (?,?,?,?,?, 'PENDING', NOW())`,
            [reporterId, reportedId, postId, commentId, reason.trim()]
        );

        return res.status(201).json({
            success: true,
            message: '신고가 접수되었습니다.',
            ReportId: result.insertId
        });
    } catch(error) {
        console.error('신고 접수 오류:', error);

        return res.status(500).json({
            success: false,
            message: '신고 처리 중 오류가 발생했습니다.'
        });
    }
});

module.exports = router;