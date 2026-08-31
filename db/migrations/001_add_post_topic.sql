-- ──────────────────────────────────────────
-- 001. 커뮤니티 게시글 주제(TOPIC) 컬럼 추가
--
--   커뮤니티 글을 별도 테이블로 빼지 않고 POST 를 재사용한다.
--   COMMENTS / LIKES / SCRAP / IMAGE / POST_LINK / REPORT 6개 테이블이
--   POST.POST_ID 를 FK 로 참조하고 있어서, 별도 테이블을 만들면
--   댓글·좋아요·신고를 커뮤니티용으로 전부 다시 만들어야 한다.
--
--   TOPIC IS NULL      → 기존 코디 게시물 (지도/피드)
--   TOPIC IS NOT NULL  → 커뮤니티 글
--
--   지도/피드 목록 쿼리는 전부 INNER JOIN REGION 이라
--   REGION_ID 가 NULL 인 커뮤니티 글은 자동으로 제외된다.
--
--   되돌리기: ALTER TABLE POST DROP COLUMN TOPIC;
--             (인덱스는 컬럼과 함께 사라진다)
-- ──────────────────────────────────────────

ALTER TABLE POST
    ADD COLUMN TOPIC VARCHAR(20) NULL DEFAULT NULL COMMENT '커뮤니티 주제. NULL이면 코디 게시물';

-- 주제별 목록 + 최신순 페이지네이션용
CREATE INDEX IDX_POST_TOPIC ON POST (TOPIC, POST_ID DESC);
