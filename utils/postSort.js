// ──────────────────────────────────────────
// 피드 정렬 옵션
//
//   ORDER BY 는 SQL 플레이스홀더(?)로 넘길 수 없다. 쿼리 문자열에 직접
//   이어붙여야 하므로, 클라이언트가 보낸 값을 그대로 쓰면 인젝션이 된다.
//   → 반드시 이 맵에서 고른 값만 쓴다.
//
//   정렬 키가 동점일 때 MySQL은 행 순서를 보장하지 않는다. 그대로 두면
//   LIMIT/OFFSET 페이지네이션에서 같은 글이 두 번 나오거나 누락되므로
//   (특히 지금은 LIKE_COUNT / SCRAP_COUNT 가 전부 0이라 전부 동점이다)
//   모든 옵션에 POST_ID 타이브레이커를 붙였다.
//
//   테이블 별칭은 두 라우터 모두 POST 를 p 로 쓰고 있다는 전제.
// ──────────────────────────────────────────
const POST_SORT = {
    latest:  'p.CREATED_DATE DESC, p.POST_ID DESC',   // 최신순
    oldest:  'p.CREATED_DATE ASC, p.POST_ID ASC',     // 오래된순
    popular: 'p.LIKE_COUNT DESC, p.POST_ID DESC',     // 좋아요 많은순
    scrap:   'p.SCRAP_COUNT DESC, p.POST_ID DESC',    // 스크랩 많은순
};

const DEFAULT_SORT = 'latest';

// 화이트리스트에 없으면 조용히 기본값(최신순)으로 떨어뜨린다.
//   단순 POST_SORT[sort] 조회는 안 된다. '__proto__' / 'constructor' 같은
//   Object.prototype 상속 키가 truthy 한 값을 돌려줘서 || 폴백을 그냥 통과하고,
//   그 값이 ORDER BY 에 박혀 500 이 난다. 자기 소유 키인지 반드시 확인한다.
function resolvePostSort(sort) {
    if (typeof sort === 'string' && Object.hasOwn(POST_SORT, sort)) {
        return POST_SORT[sort];
    }
    return POST_SORT[DEFAULT_SORT];
}

module.exports = { POST_SORT, DEFAULT_SORT, resolvePostSort };
