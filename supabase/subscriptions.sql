-- subscriptions 테이블 — DOMAIN.md 5장 Application(신청) 필드 11개를 그대로 옮긴다.
-- 주의: PRD 8장은 "저장은 브라우저 안에서만, 서버로 보내지 않는다(C1)"고 정한다.
--       이 SQL은 실험 브랜치(experiment/supabase-*) 전용이다.
-- 컬럼 이름은 PRD 표기(camelCase)를 지키려고 큰따옴표로 감싼다.
--
-- 공개 키(anon)로 할 수 있는 일은 함수 2개뿐이다.
--   create_subscription(...)  신청 1건 저장 → 신청 번호(id)를 돌려준다
--   get_subscription(p_id)    번호로 1건만, 이름 · 이메일을 가린 값으로 돌려준다
-- 테이블을 직접 읽거나 쓰는 것은 RLS와 권한으로 모두 막는다.

create table if not exists public.subscriptions (
  -- 식별자 = 신청 번호. 추측할 수 없게 서버가 무작위 UUID로 만든다.
  "id"               text        primary key default gen_random_uuid()::text,

  -- 고객 유형 4가지: 요금제 변경 / 번호이동 / 완전 신규 / 회선 추가
  "customerType"     text        not null
                     check ("customerType" in ('change', 'port', 'new', 'add')),

  -- 목적: 데이터 늘리기 / 요금 낮추기. 요금제 변경만 고르고, 나머지 유형은 비운다.
  "purpose"          text
                     check ("purpose" in ('more-data', 'lower-fee')),

  -- 약정: 12개월 / 24개월 / 약정 안 함(0)
  "contractMonths"   smallint    not null
                     check ("contractMonths" in (0, 12, 24)),

  -- 고른 요금제 → Plan (샘플 데이터라 DB에 Plan 테이블이 없어 외래 키는 걸지 않는다)
  "planId"           text        not null
                     check (btrim("planId") <> ''),

  -- 신청 시점 금액, 원 단위 정수 (R7, F6). 첫 달 = 둘째 달부터 + 위약금 (R2)
  "firstMonthAmount" integer     not null check ("firstMonthAmount" >= 0),
  "monthlyAmount"    integer     not null check ("monthlyAmount" >= 0),

  -- 받는 개인정보는 이름 · 이메일뿐 (R15)
  "name"             text        not null
                     check (btrim("name") <> ''),
  "email"            text        not null
                     check ("email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  -- 개인정보 수집·이용 동의. 동의하지 않으면 저장하지 않는다 (R17)
  "privacyConsent"   boolean     not null
                     check ("privacyConsent" = true),

  -- 신청 시각
  "createdAt"        timestamptz not null default now(),

  -- 목적은 요금제 변경 고객만 가진다
  constraint subscriptions_purpose_change_only
    check ("customerType" = 'change' or "purpose" is null),

  -- 첫 달 청구 금액은 둘째 달부터 청구 금액보다 작을 수 없다 (위약금 ≥ 0)
  constraint subscriptions_first_month_gte_monthly
    check ("firstMonthAmount" >= "monthlyAmount")
);

comment on table public.subscriptions is
  'DOMAIN.md 5장 Application(신청). 공개 키는 create_subscription · get_subscription 함수로만 접근.';

-- ---------------------------------------------------------------------------
-- RLS: 켜 두고 정책은 하나도 두지 않는다 → 공개 키로 테이블 직접 접근 불가.
-- (이전 버전에서 만든 공개 저장 · 조회 정책이 있으면 지운다)
-- ---------------------------------------------------------------------------
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_insert_public" on public.subscriptions;
drop policy if exists "subscriptions_select_public" on public.subscriptions;

revoke all on table public.subscriptions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 가리기 함수 (내부용 — 공개 키로는 직접 부를 수 없다)
-- ---------------------------------------------------------------------------

-- 이름 가운데를 가린다: 홍길동 → 홍*동, 홍길 → 홍*, 남궁민수 → 남**수
create or replace function public.mask_name(value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  n   text := btrim(value);
  len int  := char_length(n);
begin
  if len <= 1 then
    return '*';
  elsif len = 2 then
    return left(n, 1) || '*';
  end if;
  return left(n, 1) || repeat('*', len - 2) || right(n, 1);
end;
$$;

-- 이메일 @ 앞부분의 가운데 3자리를 가린다: abcdefg@x.com → ab***fg@x.com
-- 앞부분이 3자 이하면 전부 가린다.
create or replace function public.mask_email(value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  at_pos int  := position('@' in value);
  local  text := left(value, at_pos - 1);
  domain text := substr(value, at_pos + 1);
  len    int  := char_length(local);
  head   int;
begin
  if len <= 3 then
    return repeat('*', len) || '@' || domain;
  end if;
  head := (len - 3) / 2;
  return left(local, head) || '***' || right(local, len - head - 3) || '@' || domain;
end;
$$;

revoke all on function public.mask_name(text)  from public, anon, authenticated;
revoke all on function public.mask_email(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 저장: 신청 1건을 넣고 신청 번호를 돌려준다.
-- 값 검사는 테이블의 check 제약이 맡는다 (틀리면 저장 실패).
-- ---------------------------------------------------------------------------
create or replace function public.create_subscription(
  "customerType"     text,
  "purpose"          text,
  "contractMonths"   integer,
  "planId"           text,
  "firstMonthAmount" integer,
  "monthlyAmount"    integer,
  "name"             text,
  "email"            text,
  "privacyConsent"   boolean
)
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.subscriptions (
    "customerType", "purpose", "contractMonths", "planId",
    "firstMonthAmount", "monthlyAmount", "name", "email", "privacyConsent"
  ) values (
    create_subscription."customerType",
    create_subscription."purpose",
    create_subscription."contractMonths",
    create_subscription."planId",
    create_subscription."firstMonthAmount",
    create_subscription."monthlyAmount",
    btrim(create_subscription."name"),
    btrim(create_subscription."email"),
    create_subscription."privacyConsent"
  )
  returning "id";
$$;

-- ---------------------------------------------------------------------------
-- 조회: 번호로 1건만, 이름 · 이메일은 가린 값으로 돌려준다.
-- 원래 이름 · 이메일은 이 함수 밖으로 나가지 않는다.
-- ---------------------------------------------------------------------------
create or replace function public.get_subscription(p_id text)
returns table (
  "id"               text,
  "customerType"     text,
  "purpose"          text,
  "contractMonths"   smallint,
  "planId"           text,
  "firstMonthAmount" integer,
  "monthlyAmount"    integer,
  "name"             text,
  "email"            text,
  "privacyConsent"   boolean,
  "createdAt"        timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s."id",
    s."customerType",
    s."purpose",
    s."contractMonths",
    s."planId",
    s."firstMonthAmount",
    s."monthlyAmount",
    public.mask_name(s."name"),
    public.mask_email(s."email"),
    s."privacyConsent",
    s."createdAt"
  from public.subscriptions s
  where s."id" = p_id
  limit 1;
$$;

revoke all on function public.create_subscription(text, text, integer, text, integer, integer, text, text, boolean)
  from public;
revoke all on function public.get_subscription(text) from public;

grant execute on function public.create_subscription(text, text, integer, text, integer, integer, text, text, boolean)
  to anon, authenticated;
grant execute on function public.get_subscription(text) to anon, authenticated;
