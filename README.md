# 파크골프세계 홈페이지

파크골프세계 주식회사의 인터넷신문 홈페이지입니다. 화면은 GitHub Pages, 데이터(회원·글·댓글·사진)는 Supabase에 둡니다.

## 폴더 구성

```
index.html            첫 화면
schedule.html         대회 일정
news.html             뉴스 목록
article.html          기사 보기 (?id=번호)
column.html           독자칼럼
board.html            자유게시판
join.html             조인게시판
talk.html             파크톡
place.html            장소 길찾기
login.html            로그인·회원가입
mypage.html           마이페이지
404.html              없는 주소 안내
admin/                관리자 화면 (index, stats)
assets/css/style.css  공통 디자인 (글꼴: Pretendard, SIL OFL 1.1)
assets/js/config.js   사이트 이름, Supabase 주소와 공개키 (이 파일 한 곳에서만 설정)
assets/js/supabase.js Supabase 연결
assets/js/auth.js     로그인 공통
assets/js/app.js      메뉴, 머리글, 바닥글, 목록 불러오기
assets/js/navi.js     길찾기 공통 (네이버·카카오 자동차 길안내)
assets/img/           로고·아이콘
newsletter/           뉴스레터 호별 html
supabase/             데이터베이스 설계도 (표, 권한 규칙, 파일 보관함)
```

## 지켜야 할 것

- 저장소는 공개입니다. Supabase service_role 키(관리자 키)와 비밀번호는 절대 올리지 않습니다. config.js에는 anon(공개) 키만 넣습니다.
- 글꼴은 상업적으로 무료인 글꼴만 씁니다: 'Pretendard Variable',Pretendard,'Noto Sans KR',sans-serif
- 기사 사진처럼 계속 늘어나는 파일은 Supabase Storage에 올립니다.
