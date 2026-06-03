const express = require("express");
const pool = require("../config/db");
const router = express.Router();

// 스크랩 목록
router.get("/:profileId/scraps", async (req, res) => {
    try{
        const { profileId } = req.params;

        const [rows] = await pool.query(
            `
            SELECT
                S.SCRAP_ID,
                S.CREATED_DATE AS SCRAP_CREATED_DATE,
                P.POST_ID,
                P.CONTENT,
                P.SEASON,
                P.VIEW_COUNT,
                P.SCRAP_COUNT,
                P.LIKE_COUNT,
                P.CREATED_DATE AS POST_CREATED_DATE,
                AUTHOR.ID AS AUTHOR_ID,
                AUTHOR.NAME AS AUTHOR_NAME,
                GROUP_CONCAT(DISTINCT I.URL ORDER BY I.IMAGE_ID SEPARATOR '||') AS IMAGE_URLS,
                GROUP_CONCAT(DISTINCT PL.URL ORDER BY PL.LINK_ID SEPARATOR '||') AS LINK_URLS
            FROM SCRAP S
            JOIN USERS U ON S.MEMBER_ID = U.USER_ID
            JOIN POST P ON S.POST_ID = P.POST_ID
            JOIN USERS AUTHOR ON P.MEMBER_ID = AUTHOR.USER_ID
            LEFT JOIN IMAGE I ON P.POST_ID = I.POST_ID
            LEFT JOIN POST_LINK PL ON P.POST_ID = PL.POST_ID
            WHERE U.ID = ?
            GROUP BY
                S.SCRAP_ID, S.CREATED_DATE,
                P.POST_ID, P.CONTENT, P.SEASON, P.VIEW_COUNT, P.SCRAP_COUNT,
                P.LIKE_COUNT, P.CREATED_DATE,
                AUTHOR.ID, AUTHOR.NAME
            ORDER BY S.CREATED_DATE DESC
            `,
            [profileId]
        );

        return res.json({
            success: true,
            scraps: rows
        });
    } catch(error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "스크랩 목록을 불러오지 못했습니다."
        });
    }
});

// 팔로워/팔로잉 목록
router.get("/:profileId/follows", async (req, res) => {
    try {
        const { profileId } = req.params;

        const [followers] = await pool.query(
            `
            SELECT
                F.FOLLOW_ID,
                F.CREATED_DATE,
                U.USER_ID,
                U.ID,
                U.NAME
            FROM FOLLOW F
            JOIN USERS TARGET ON F.FOLLOWING_ID = TARGET.USER_ID
            JOIN USERS U ON F.FOLLOWER_ID = U.USER_ID
            WHERE TARGET.ID = ?
            ORDER BY F.CREATED_DATE DESC
            `,
            [profileId]
        );

        const [followings] = await pool.query(
            `
            SELECT
                F.FOLLOW_ID,
                F.CREATED_DATE,
                U.USER_ID,
                U.ID,
                U.NAME
            FROM FOLLOW F
            JOIN USERS ME ON F.FOLLOWER_ID = ME.USER_ID
            JOIN USERS U ON F.FOLLOWING_ID = U.USER_ID
            WHERE ME.ID = ?
            ORDER BY F.CREATED_DATE DESC
            `,
            [profileId]
        );

        return res.json({
            success: true,
            followers,
            followings
        });
    } catch(error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "팔로우 목록을 불러오지 못했습니다."
        });
    }
});

// 내 게시물
router.get("/:profileId/posts", async (req, res) => {
    try {
        const { profileId } = req.params;

        const [rows] = await pool.query(
            `
            SELECT
                P.POST_ID,
                P.CONTENT,
                P.SEASON,
                P.VIEW_COUNT,
                P.SCRAP_COUNT,
                P.LIKE_COUNT,
                P.CREATED_DATE,
                U.ID AS AUTHOR_ID,
                U.NAME AS AUTHOR_NAME,
                GROUP_CONCAT(DISTINCT I.URL ORDER BY I.IMAGE_ID SEPARATOR '||') AS IMAGE_URLS,
                GROUP_CONCAT(DISTINCT PL.URL ORDER BY PL.LINK_ID SEPARATOR '||') AS LINK_URLS
            FROM POST P
            JOIN USERS U ON P.MEMBER_ID = U.USER_ID
            LEFT JOIN IMAGE I ON P.POST_ID = I.POST_ID
            LEFT JOIN POST_LINK PL ON P.POST_ID = PL.POST_ID
            WHERE U.ID = ?
            GROUP BY
                P.POST_ID, P.CONTENT, P.SEASON, P.VIEW_COUNT,
                P.SCRAP_COUNT, P.LIKE_COUNT, P.CREATED_DATE,
                U.ID, U.NAME
            ORDER BY P.CREATED_DATE DESC
            `,
            [profileId]
        );

        return res.json({
            success: true,
            posts: rows
        });
    } catch(error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "게시물을 불러오지 못했습니다."
        });
    }
});


// 내 댓글
router.get("/:profileId/comments", async(req, res) => {
    try {
        const { profileId } = req.params;

        const [rows] = await pool.query(
            `
            SELECT
                C.COMMENT_ID,
                C.CONTENT AS COMMENT_CONTENT,
                C.CREATED_DATE AS COMMENT_CREATED_DATE,
                P.POST_ID,
                P.CONTENT AS POST_CONTENT,
                P.SEASON,
                AUTHOR.ID AS POST_AUTHOR_ID,
                AUTHOR.NAME AS POST_AUTHOR_NAME,
                GROUP_CONCAT(DISTINCT I.URL ORDER BY I.IMAGE_ID SEPARATOR '||') AS IMAGE_URLS
            FROM COMMENTS C
            JOIN USERS U ON C.MEMBER_ID = U.USER_ID
            JOIN POST P ON C.POST_ID = P.POST_ID
            JOIN USERS AUTHOR ON P.MEMBER_ID = AUTHOR.USER_ID
            LEFT JOIN IMAGE I ON P.POST_ID = I.POST_ID
            WHERE U.ID = ?
            GROUP BY
                C.COMMENT_ID, C.CONTENT, C.CREATED_DATE,
                P.POST_ID, P.CONTENT, P.SEASON,
                AUTHOR.ID, AUTHOR.NAME
            ORDER BY C.CREATED_DATE DESC
            `,
            [profileId]
        );
        
        return res.json({
            success: true,
            comments: rows
        });
    } catch(error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "댓글을 불러오지 못했습니다."
        });
    }
});

module.exports = router;