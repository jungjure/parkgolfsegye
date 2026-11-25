-- 013 parkgolfnews.org 자동 가져오기(동조화) 중지 (2026-11-25, 사용자 지시 "파크골프뉴스 홈페이지와 동조화된것 모두 끊어줘")
-- 이미 가져온 일정·기사는 그대로 두고, 매시간 가져오는 예약 작업 4개만 지움. 함수는 남겨 두어 다시 켤 수 있음.
select cron.unschedule('pgs_events_request');
select cron.unschedule('pgs_events_apply');
select cron.unschedule('pgs_news_request');
select cron.unschedule('pgs_news_apply');
