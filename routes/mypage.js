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