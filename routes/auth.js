const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const pool = require("../config/db");
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
        const { email, password } = req.body;

        if(!email || !password) {
            return res.status(400).json({
                success: false,
                message: "이메일과 비밀번호를 입력해주세요."
            });
        }

        const[rows] = await pool.query(
            `
            SELECT USER_ID, ID, NAME, EMAIL, PASSWORD, STATUS
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

        if(user.STATUS !== "ACTIVE") {
            return res.status(403).json({
                success: false,
                message: "사용할 수 없는 계정입니다."
            });
        }

        const isMatch = await bcrypt.compare(password, user.PASSWORD);

        if(!isMatch) {
            return res.status(401).json({
                success: false,
                message: "이메일 또는 비밀번호가 올바르지 않습니다."
            });
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
router.get("/mypage", (req, res) => {
    if(!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "로그인이 필요합니다."
        });
    }

    return res.json({
        success: true,
        user: req.session.user
    });
});

// 로그인 확인 미들웨어
function requireLogin(req, res, next) {
    if(!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "로그인이 필요합니다."
        });
    }
    next();
}

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

module.exports = router;