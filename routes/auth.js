const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const pool = require("../config/db");
const { requireLogin } = require('../middleware/authMiddleware');
const router = express.Router();

function isValidUserId(userId) {
    const idPattern = /^[A-Za-z0-9!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]{8}$/;
    return idPattern.test(userId);
}

function isValidPassword(password) {
    const passwordPattern = /^[A-Za-z0-9!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]+$/;
    return passwordPattern.test(password);
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

function createTempPassword() {
    return crypto.randomBytes(6).toString("base64").replace(/[+/=]/g, "").slice(0, 8);
}

// 회원가입
router.post("/signup",async(req, res) => {
    try{
        const { name, email, userId, password} = req.body;

        if(!name || !email || !userId || !password) {
            return res.status(400).json({
                success: false,
                message : "모든 항목을 입력해주세요."
            });
        }

        if (!isValidUserId(userId)) {
            return res.status(400).json({
                success: false,
                message: "아이디는 영문, 숫자, 기호를 사용하여 정확히 8자리로 입력해주세요."
            });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                message: "비밀번호는 영문, 숫자, 기호만 사용할 수 있습니다."
            });
        }

        const [duplicateRows] = await pool.query(
            "SELECT EMAIL, ID FROM USERS WHERE EMAIL = ? OR ID = ?",
            [email, userId]
        );

        if(duplicateRows.length > 0) {
            const emailDuplicated = duplicateRows.some(user => user.EMAIL === email);
            const idDuplicated = duplicateRows.some(user => user.ID === userId);

            if(emailDuplicated) {
                return res.status(409).json({
                    success: false,
                    message: "이미 사용 중인 이메일입니다."
                });
            }

            if(idDuplicated) {
                return res.status(409).json({
                    success: false,
                    message: "이미 사용 중인 아이디입니다."
                });
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await pool.query(
            `
            INSERT INTO USERS (NAME, EMAIL, ID, PASSWORD) VALUES (?,?,?,?)
            `,
            [name, email, userId, passwordHash]
        );

        return res.status(201).json({
            success: true,
            message: "회원가입이 완료되었습니다."
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message:"서버 오류가 발생했습니다."
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password, autoLogin } = req.body;

        if(!email || !password) {
            return res.status(400).json({
                success: false,
                message: "이메일과 비밀번호를 입력해주세요."
            });
        }

        const[rows] = await pool.query(
            `
            SELECT USER_ID, ID, NAME, EMAIL, PASSWORD, STATUS, SUSPENDED_UNTIL
            FROM USERS
            WHERE EMAIL = ?
            `,
            [email]
        );

        if(rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "이메일 또는 비밀번호가 올바르지 않습니다."
            });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.PASSWORD);

        if(!isMatch) {
            return res.status(401).json({
                success: false,
                message: "이메일 또는 비밀번호가 올바르지 않습니다."
            });
        }

        // 탈퇴 회원
        if(user.STATUS === 'DELETED') {
            return res.status(403).json({
                success: false,
                message: '탈퇴한 회원입니다.'
            });
        }
        
        // 영구 정지 회원
        if(user.STATUS === 'BANNED') {
            return res.status(403).json({
                success: false,
                message: '영구 정지된 계정입니다.'
            });
        }

        // 기간 정지 회원
        if(user.STATUS === 'SUSPENDED') {
            if(!user.SUSPENDED_UNTIL) {
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
                WHERE USER_ID = ?`,
                [user.USER_ID]
            );

            // 아직 정지 기간이 남았을 경우
            if(suspensionRows[0].IS_SUSPENDED === 1) {
                return res.status(403).json({
                    success: false,
                    message: '현재 이용이 정지된 계정입니다.',
                    suspendedUntil: user.SUSPENDED_UNTIL
                });
            }

            // 정지 기간이 끝났으면 자동 해체
            await pool.query(
                `UPDATE USERS SET STATUS='ACTIVE', SUSPENDED_UNTIL=NULL
                WHERE USER_ID = ? `,[user.USER_ID]
            );
            user.STATUS = 'ACTIVE';

        if(user.STATUS !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: "사용할 수 없는 계정입니다."
            });
        }
         
        }
        
        const One_Day = 1000 * 60 * 60 * 24

        if(autoLogin) {
            // 자동 로그인 시 1일 유지
            req.session.cookie.maxAge = One_Day;
        } else {
            req.session.cookie.maxAge = null;
        }
 
        req.session.user = {
            userId: user.USER_ID,
            name: user.NAME,
            email: user.EMAIL,
            profileId: user.ID
        };

        return res.json({
            success: true,
            message: "로그인 성공",
            user: req.session.user
        });

    } catch(error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "서버 오류가 발생했습니다."
        });
    }
});

router.get('/check-login', (req, res) => {
    if (req.session.user) {
        return res.status(200).json({
                loggedIn: true,
                user: req.session.user
            });
    }

    return res.status(200).json({
        loggedIn: false
    });
});

// 로그아웃
router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");

        return res.json({
            success: true,
            message: "로그아웃 되었습니다."
        });
    });
});

// 이메일 중복확인
router.get("/check-email", async(req,res) => {
    try {
        const { email } = req.query;

        if(!email) {
            return res.status(400).json({
                success: false,
                available: false,
                message: "이메일을 입력해주세요."
            });
        }

        const [rows] = await pool.query(
            "SELECT USER_ID FROM USERS WHERE EMAIL=?",
            [email]
        );

        if(rows.length > 0) {
            return res.json({
                success: true,
                available: false,
                message: "이미 사용 중인 이메일입니다."
            });
        }

        return res.json({
            success: true,
            available: true,
            message: "사용 가능한 이메일입니다."
        });
    } catch(error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            available: false,
            message: "서버 오류가 발생했습니다."
        });
    }
});

// 아이디 중복확인
router.get("/check-id", async(req, res) => {
    try {
        const { userId } = req.query;

        if(!userId) {
            return res.status(400).json({
                success: false,
                available: false,
                message: "아이디를 입력해주세요."
            });
        }

        if (!isValidUserId(userId)) {
            return res.status(400).json({
                success: false,
                available: false,
                message: "아이디는 영문, 숫자, 기호를 사용하여 정확히 8자리로 입력해주세요."
            });
        }

        const [rows] = await pool.query(
            "SELECT USER_ID FROM USERS WHERE ID = ?",
            [userId]
        );

        if(rows.length > 0) {
            return res.json({
                success: true,
                available: false,
                message: "이미 사용 중인 아이디입니다."
            });
        }

        return res.json({
            success: true,
            available: true,
            message: "사용 가능한 아이디입니다."
        });
    } catch(error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            available: false,
            message: "서버 오류가 발생했습니다."
        });
    }
});

// 마이페이지
router.get("/mypage", requireLogin, (req, res) => {
    // if(!req.session.user) {
    //     return res.status(401).json({
    //         success: false,
    //         message: "로그인이 필요합니다."
    //     });
    // }

    return res.json({
        success: true,
        user: req.session.user
    });
});



// 아이디,비밀번호 변경
router.patch("/modify", requireLogin, async(req, res) => {
    try {
        const { newId, newPassword } = req.body;
        const userId = req.session.user.userId;
        let isIdChanged = false;
        let isPasswordChanged = false;

        if(!newId && !newPassword) {
            return res.status(400).json({
                success: false,
                message: "변경할 아이디 또는 비밀번호를 입력해주세요."
            });
        }

        if(newId) {
            const trimmedId = newId.trim().replace(/^@/,"");

            if (!isValidUserId(trimmedId)) {
                return res.status(400).json({
                success: false,
                message: "아이디는 영문, 숫자, 기호를 사용하여 정확히 8자리로 입력해주세요."
            });
        }

        const [duplicateRows] = await pool.query(
             `
            SELECT USER_ID
            FROM USERS
            WHERE ID = ? AND USER_ID <> ?
            `,
            [trimmedId, userId]
        );

        if(duplicateRows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "이미 사용 중인 아이디입니다."
            });
        }

        await pool.query(
            `
            UPDATE USERS
            SET ID = ?
            WHERE USER_ID = ?
            `,
            [trimmedId, userId]
        );

        req.session.user.profileId = trimmedId;
        isIdChanged = true;
    } 

    // 비밀번호 변경
    if (newPassword) {
    if (!isValidPassword(newPassword)) {
        return res.status(400).json({
            success: false,
            message: "비밀번호는 영문, 숫자, 기호만 사용할 수 있습니다."
        });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `
            UPDATE USERS
            SET PASSWORD = ?
            WHERE USER_ID = ?
            `,
            [passwordHash, userId]
        );
        isPasswordChanged = true;
    }
    
    let message = "정보가 변경되었습니다.";

    if(isIdChanged && isPasswordChanged) {
        message = "아이디와 비밀번호가 변경되었습니다.";
    } else if(isIdChanged) {
        message = "아이디가 변경되었습니다.";
    } else if(isPasswordChanged) {
        message = "비밀번호가 변경되었습니다.";
    }

    return res.json({
        success: true,
        message: message,
        user: req.session.user,
        profileId: req.session.user.profileId
    });

    } catch(error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "서버 오류가 발생했습니다."
        });
    }
});

// 비밀번호 찾기_인증번호 전송
router.post("/find_pw", async(req, res) => {
    try{
        const {email } = req.body;

        if(!email) {
            return res.status(400).json({
                success: false,
                message: "이메일을 입력해주세요."
            });
        }

        const [rows] = await pool.query(
            `
            SELECT USER_ID, EMAIL, ID
            FROM USERS
            WHERE EMAIL = ?
            `,
            [email]
        );

        if(rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "일치하는 회원 정보를 찾을 수 없습니다."
            });
        }

        const user = rows[0];

        const tempPassword = createTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        
       await pool.query(
        `
        UPDATE USERS
        SET PASSWORD = ?
        WHERE USER_ID = ?
        `,
        [passwordHash, user.USER_ID]
       );

        await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: user.EMAIL,
            subject: "[CODIMAP] 임시 비밀번호가 발송되었습니다.",
            text: `
            안녕하세요 CODIMAP입니다.
            임시 비밀번호는 아래와 같습니다.
            임시 비밀번호: ${tempPassword}
            로그인 후 반드시 비밀번호를 변경해주시기 바랍니다.
            `
        });

        return res.json({
            success: true,
            message: "임시 비밀번호가 이메일로 전송되었습니다."
        });
    } catch(error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "임시 비밀번호 전송 중 서버 오류가 발생했습니다."
        });
    }
})

router.delete('/delete_account',requireLogin, async(req, res)=> {
    try{
        // 로그인 확인
        const userId = req.session.user.userId;

        // if(!userId) {
        //     return res.status(401).json({
        //         success: false,
        //         message: '로그인이 필요합니다.'
        //     });
        // }

        // 입력한 비밀번호
        const { password } = req.body;

        if(!password) {
            return res.status(400).json({
                success: false,
                message: '비밀번호를 입력해주세요.'
            });
        }

        // 현재 회원 조회
        const [rows] = await pool.query(
            `SELECT USER_ID, PASSWORD, STATUS
            FROM USERS
            WHERE USER_ID = ?`,
            [userId]
        );

        const [socialRows] = await pool.query(
            `SELECT PROVIDER, PROVIDER_USER_ID
            FROM USER_SOCIAL_ACCOUNTS
            WHERE USER_ID = ?`,[userId]
        );
        
        const isSocialUser = socialRows.length > 0;

        if(rows.length === 0 ) {
            return res.status(404).json({
                success: false,
                message: '회원 정보를 찾을 수 없습니다.'
            });
        }

        const user = rows[0];

        // 이미 탈퇴한 회원인지 확인
        if(user.STATUS === 'DELETED') {
            return res.status(400).json({
                success: false,
                message: '이미 탈퇴한 회원입니다.'
            });
        }

        // 비밀번호 비교
        const passwordMatch = await bcrypt.compare(password, user.PASSWORD);

        if(!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: '비밀번호가 일치하지 않습니다.'
            });
        }

        // 회원 상태 변경
        await pool.query(
            `UPDATE USERS
            SET STATUS = 'DELETED'
            WHERE USER_ID = ?`,
            [userId]
        );

        // 세션 삭제
        req.session.destroy((error) => {
            if(error) {
                console.error('세션 삭제 오류:', error);

                return res.status(500).json({
                    success: false,
                    message: '회원탈퇴 후 로그아웃 처리에 실패했습니다.'
                });
            }

            res.clearCookie('connect.sid');

            return res.status(200).json({
                success: true,
                message: '회원탈퇴가 완료되었습니다.'
            });
        });
    } catch (error) {
        console.error('회원탈퇴 오류:', error);
        
        return res.status(500).json({
            success: false,
            message: '회원탈퇴 처리 중 오류가 발생했습니다.'
        });
    }
});

module.exports = router;