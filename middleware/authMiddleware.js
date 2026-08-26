// 로그인 확인 미들웨어
async function requireLogin(req, res, next) {
    // console.log("========== requireLogin ==========");
    // console.log("method:", req.method);
    // console.log("url:", req.originalUrl);
    // console.log("sessionID:", req.sessionID);
    // console.log("session:", req.session);
    // console.log("session.user:", req.session?.user);
    
    // 세션 자체가 없는 경우
    try{
         if(!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "로그인이 필요합니다."
        });
    }

    const userId = req.session.user.userId;

    // 현재 DB 상태 다시 확인
    const [rows] = await pool.query(
        `SELECT USER_ID, STATUS, SUSPENDED_UNTIL
        FROM USERS
        WHERE USER_ID = ?`,[userId]
    );

    if(rows.length === 0) {
        req.session.destroy(() => {});

        return res.status(401).json({
            success: false,
            message: "존재하지 않는 사용자입니다."
        });
    }

    const user = rows[0];

    // 탈퇴
    if(user.STATUS === 'DELETED') {
        req.session.destroy(() => {});

        return res.status(403).json({
            success: false,
            message: '탈퇴한 회원입니다.'
        });
    }

    // 영구 정지
    if(user.STATUS === 'BANNED') {
        req.session.destroy(() => {});

        return res.status(403).json({
            success: false,
            message: '영구 정지된 계정입니다.'
        });
    }

    // 기간 정지
    if(user.STATUS === 'SUSPENDED') {
        if(!user.SUSPENDED_UNTIL) {
            req.session.destroy(() => {});

            return res.status(403).json({
                success: false,
                message: '현재 이용이 정지된 계정입니다.'
            });
        }

        const [suspensionRows] = await pool.query(
            `SELECT 
                CASE
                    WHEN SUSPENDED_UNTIL > NOW() THEN 1
                    ELSE 0
                END AS IS_SUSPENDED
            FROM USERS
            WHERE USER_ID = ?`,[userId]
        );

        // 아직 정지 중
        if(suspensionRows[0].IS_SUSPENDED === 1) {
            req.session.destroy(() => {});

            return res.status(403).json({
                success: false,
                message: '현재 이용이 정지된 계정입니다.',
                suspendedUntil: user.SUSPENDED_UNTIL
            });
        }

        // 정지 기간 만료되면 자동 해제
        await pool.query(
            `UPDATE USERS
            SET STATUS='ACTIVE'
                SUSPENDED_UNTIL = NULL
            WHERE USER_ID = ?`, [userId]
        );
    }
    next();
} catch(error) {
    console.error('로그인 상태 확인 오류:',error);

    return res.status(500).json({
        success: false,
        message: '사용자 상태 확인 중 오류가 발생했습니다.'
    });
}
}