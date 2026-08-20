const express = require("express");
const pool = require("../config/db");
const router = express.Router();

// ──────────────────────────────────────────
// 관리자 권한 확인 미들웨어
// USERS.ROLE = 'ADMIN' 인 세션 사용자만 허용
// ──────────────────────────────────────────
async function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "로그인이 필요합니다." });
    }
    try {
        const [rows] = await pool.query(
            "SELECT ROLE FROM USERS WHERE USER_ID = ?",
            [req.session.user.userId]
        );
        if (rows.length === 0 || rows[0].ROLE !== "ADMIN") {
            return res.status(403).json({ success: false, message: "관리자 권한이 없습니다." });
        }
        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
    }
}

// 관리자 여부 확인 (프론트에서 페이지 접근 판단용)
//   ⚠️ 현재 /admin 으로 들어가는 링크가 어디에도 없어 주소창 직접 입력만 가능.
//   TODO: 관리자에게만 보이는 진입 버튼 추가.
//         이 엔드포인트를 호출해 isAdmin 이 true 일 때만 렌더링하면 됨.
//           const { isAdmin } = await (await fetch('/api/admin/check')).json();
//           if (isAdmin) { /* 버튼 노출 → location.href = '/admin' */ }
//         공통 헤더가 없으므로 페이지별로 넣어야 함. 마이페이지가 유력하나
//         해당 화면은 별도 작업 중이라, 위치는 담당자와 조율 후 결정.
router.get("/check", async (req, res) => {
    if (!req.session.user) {
        return res.json({ isAdmin: false });
    }
    try {
        const [rows] = await pool.query(
            "SELECT ROLE FROM USERS WHERE USER_ID = ?",
            [req.session.user.userId]
        );
        return res.json({ isAdmin: rows.length > 0 && rows[0].ROLE === "ADMIN" });
    } catch (error) {
        console.error(error);
        return res.json({ isAdmin: false });
    }
});

// ──────────────────────────────────────────
// 신고 목록 조회 (신고자·피신고자·게시물 정보 포함)
// GET /api/admin/reports?status=pending
// ──────────────────────────────────────────
router.get("/reports", requireAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        const conditions = [];
        const params = [];

        if (status && ["pending", "resolved", "rejected"].includes(status)) {
            conditions.push("R.STATUS = ?");
            params.push(status);
        }
        const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

        const [rows] = await pool.query(
            `
            SELECT
                R.REPORT_ID,
                R.REASON,
                R.STATUS,
                R.CREATED_DATE,
                R.POST_ID,
                REPORTER.ID   AS REPORTER_PROFILE_ID,
                REPORTER.NAME AS REPORTER_NAME,
                REPORTED.USER_ID AS REPORTED_USER_ID,
                REPORTED.ID   AS REPORTED_PROFILE_ID,
                REPORTED.NAME AS REPORTED_NAME,
                REPORTED.STATUS AS REPORTED_STATUS,
                (SELECT COUNT(*) FROM REPORT R2 WHERE R2.REPORTED_ID = R.REPORTED_ID) AS REPORTED_TOTAL,
                (SELECT COUNT(*) FROM REPORT R3 WHERE R3.REPORTED_ID = R.REPORTED_ID AND R3.STATUS = 'pending') AS REPORTED_PENDING,
                P.CONTENT AS POST_CONTENT,
                (SELECT I.URL FROM IMAGE I WHERE I.POST_ID = R.POST_ID ORDER BY I.IMAGE_ID LIMIT 1) AS POST_IMAGE
            FROM REPORT R
            JOIN USERS REPORTER ON R.REPORTER_ID = REPORTER.USER_ID
            JOIN USERS REPORTED ON R.REPORTED_ID = REPORTED.USER_ID
            LEFT JOIN POST P ON R.POST_ID = P.POST_ID
            ${where}
            ORDER BY R.CREATED_DATE DESC
            `,
            params
        );

        return res.json({ success: true, reports: rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "신고 목록을 불러오지 못했습니다." });
    }
});

// ──────────────────────────────────────────
// 신고 처리 상태 변경
// PATCH /api/admin/reports/:reportId  body: { status: 'resolved' | 'rejected' | 'pending' }
// ──────────────────────────────────────────
router.patch("/reports/:reportId", requireAdmin, async (req, res) => {
    try {
        const reportId = Number(req.params.reportId);
        const { status } = req.body;

        if (!["pending", "resolved", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "잘못된 상태값입니다." });
        }

        const [result] = await pool.query(
            "UPDATE REPORT SET STATUS = ? WHERE REPORT_ID = ?",
            [status, reportId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "신고를 찾을 수 없습니다." });
        }
        return res.json({ success: true, message: "신고 상태가 변경되었습니다." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "신고 처리에 실패했습니다." });
    }
});

// ──────────────────────────────────────────
// 유저 상태 변경 (정지 / 정지 해제)
// PATCH /api/admin/users/:userId/status  body: { status: 'ACTIVE' | 'SUSPENDED' }
// ──────────────────────────────────────────
router.patch("/users/:userId/status", requireAdmin, async (req, res) => {
    try {
        const targetUserId = Number(req.params.userId);
        const { status } = req.body;

        if (!["ACTIVE", "SUSPENDED"].includes(status)) {
            return res.status(400).json({ success: false, message: "잘못된 상태값입니다." });
        }
        if (targetUserId === req.session.user.userId) {
            return res.status(400).json({ success: false, message: "본인 계정은 변경할 수 없습니다." });
        }

        const [result] = await pool.query(
            "UPDATE USERS SET STATUS = ? WHERE USER_ID = ?",
            [status, targetUserId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "유저를 찾을 수 없습니다." });
        }
        return res.json({
            success: true,
            message: status === "SUSPENDED" ? "유저를 정지했습니다." : "유저 정지를 해제했습니다."
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "유저 상태 변경에 실패했습니다." });
    }
});

// ──────────────────────────────────────────
// 신고된 게시물 삭제
// DELETE /api/admin/posts/:postId
// ──────────────────────────────────────────
router.delete("/posts/:postId", requireAdmin, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const postId = Number(req.params.postId);
        await conn.beginTransaction();

        await conn.query("DELETE FROM COMMENTS WHERE POST_ID = ?", [postId]);
        await conn.query("DELETE FROM LIKES WHERE POST_ID = ?", [postId]);
        await conn.query("DELETE FROM SCRAP WHERE POST_ID = ?", [postId]);
        await conn.query("DELETE FROM POST_LINK WHERE POST_ID = ?", [postId]);
        await conn.query("DELETE FROM IMAGE WHERE POST_ID = ?", [postId]);
        // 해당 게시물 신고는 처리 완료로 표시
        await conn.query("UPDATE REPORT SET STATUS = 'resolved' WHERE POST_ID = ?", [postId]);
        const [result] = await conn.query("DELETE FROM POST WHERE POST_ID = ?", [postId]);

        await conn.commit();

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: "이미 삭제된 게시물입니다." });
        }
        return res.json({ success: true, message: "게시물이 삭제되었습니다." });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: "게시물 삭제에 실패했습니다." });
    } finally {
        conn.release();
    }
});

module.exports = router;
