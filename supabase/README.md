# supabase

파크골프세계 데이터베이스 설계도입니다.

1. Supabase > SQL Editor 에서 migrations 폴더의 파일을 001 -> 002 -> 003 순서로 실행합니다.
2. 필요하면 seed.sql 로 구장 목록 등을 넣습니다.
3. 첫 관리자 지정: 가입 후 SQL Editor 에서
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = '관리자 이메일');

| 표 | 내용 |
|---|---|
| profiles | 회원 (별명, 지역, 등급) |
| venues | 구장 (주소, 좌표) |
| events | 대회·행사 일정 |
| articles | 뉴스 기사 |
| posts | 독자칼럼(column), 자유게시판(free) |
| comments | 댓글 |
| reactions | 최고예요·좋아요·싫어요 |
| joins / join_applies | 조인 모집글과 신청 |
| talk_messages | 파크톡 |
| subscribers | 뉴스레터 구독자 |
| page_views | 방문 통계 |

파일 보관함(Storage): article-images, board-images, avatars, newsletter
