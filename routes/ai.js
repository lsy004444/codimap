const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const db = require('../config/db');

router.get('/welcome', (req, res) => {
  res.json({
    message: "안녕하세요! 코디맵 코디 컨설턴트입니다 "
  })
})

router.post('/recommend', async (req, res) => {
  const { question, season, gender, style } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview"});

    const prompt = `너는 코디맵의 AI 코디 추천 어시스턴트야. 
    계절(${season}), 성별(${gender}), 스타일(${style}) 정보를 참고해서 구체적이고 실용적인 코디를 추천해줘.

    다음 JSON 형식으로만 답변해줘 (다른 텍스트 없이):
    {
      "answer": "코디 추천 답변 텍스트",
      "keywords": ["옷종류1", "옷종류2"]
    }

    규칙:
    - answer는 마크다운 문법 없이 일반 텍스트로, 상의/하의/신발/포인트 아이템 순서로 간결하게
    - keywords는 게시물 검색에 쓸 핵심 옷 종류 단어 1~3개 (예: "니트", "치노팬츠", "스니커즈")
    - 이모지는 answer 안에서 적당히만 사용

    참고로 이 사용자가 최근에 관심 가졌던 스타일 : ${pastKeywords.map(k => k.KEYWORD).join(', ')}

    사용자 질문: ${question}`;

    const result = await generateWithRetry(model,prompt);
    const answer = result.response.text();
    const parsed = JSON.parse(answer.replace(/```json|```/g, '').trim());
    const matchedPosts = await findMatchingPosts(season, parsed.keywords);

    if (req.session.user) {
      for (const keyword of parsed.keywords) {
        await db.query(
          `INSERT INTO USER_STYLE_HISTORY (MEMBER_ID, KEYWORD) VALUES (?, ?)`,
          [req.session.user.userId, keyword]
        );
      }
    }

    res.json({
    answer: parsed.answer,
    images: matchedPosts.map(p => p.URL),
    postIds: matchedPosts.map(p => p.POST_ID)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI 추천 생성 실패' });
  }
});

async function findMatchingPosts(season, keywords = [], limit = 3) {
  if (!keywords || keywords.length === 0) {
    // 키워드 없으면 기존처럼 계절만으로 검색
    const [rows] = await db.query(
      `SELECT p.POST_ID, i.URL FROM POST p JOIN IMAGE i ON p.POST_ID = i.POST_ID WHERE p.SEASON = ? ORDER BY p.POST_ID DESC LIMIT ?`,
      [season, limit]
    );
    return rows;
  }

  const likeConditions = keywords.map(() => 'p.CONTENT LIKE ?').join(' OR ');
  const likeParams = keywords.map(k => `%${k}%`);
  const [rows] = await db.query(
    `SELECT p.POST_ID, i.URL
     FROM POST p
     JOIN IMAGE i ON p.POST_ID = i.POST_ID
     WHERE p.SEASON = ?
     ORDER BY p.POST_ID DESC
     LIMIT ?`,
    [season, limit]
  );
  return rows;
}

async function generateWithRetry(model, prompt, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      if (err.status === 503 && i < retries) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}

//질문했던 내용 반영해서 답변하기
const [pastKeywords] = await db.query (
  'SELECT DISTINCT KEYWORD FROM USER_STYLE_HISTORY WHERE MEMBER_ID = ? ORDER BY CREATED_DATE DESC LIMIT 5',
  [req.session.user.userId]
);

module.exports = router;