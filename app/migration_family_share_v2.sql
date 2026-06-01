-- =====================================================================
-- FAMILY SCHEDULER - 가족 공유 및 RLS 보안 강화 마이그레이션 SQL (v2)
-- Production-safe revision by Codex, 2026-06-01
-- =====================================================================
--
-- 실행 전 주의:
-- - 기존 families/diary 데이터를 삭제하지 않도록 DROP TABLE을 사용하지 않습니다.
-- - 기존 user_id 기반 데이터를 family_id로 백필한 뒤 가족 단위 RLS를 적용합니다.
-- - Supabase SQL Editor 또는 service/admin 권한 DB 접속으로 실행해야 합니다.

begin;

-- 1. 필요한 확장기능 활성화
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 2. Private helper schema
create schema if not exists private;
grant usage on schema private to authenticated;

-- 3. 가족 그룹 및 멤버십 테이블
create table if not exists public.families (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    invite_code text unique not null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.family_members (
    user_id uuid primary key references auth.users(id) on delete cascade,
    family_id uuid not null references public.families(id) on delete cascade,
    role text not null default 'member' check (role in ('owner', 'member')),
    display_name text,
    joined_at timestamptz not null default now()
);

create index if not exists idx_family_members_family_id on public.family_members(family_id);

-- 4. RLS 재귀 방지 helper functions
create or replace function private.get_user_family_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
    select fm.family_id
    from public.family_members fm
    where fm.user_id = (select auth.uid())
    limit 1
$$;

create or replace function private.is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.family_members fm
        where fm.user_id = (select auth.uid())
          and fm.family_id = target_family_id
    )
$$;

grant execute on function private.get_user_family_id() to authenticated;
grant execute on function private.is_family_member(uuid) to authenticated;

-- 5. 다이어리 및 댓글 테이블
create table if not exists public.diary (
    id uuid primary key default gen_random_uuid(),
    family_id uuid not null references public.families(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    child text not null default 'child1',
    date date not null,
    time text,
    mood text not null default '😊',
    title text not null,
    text text,
    image_paths text[] not null default '{}',
    reactions text[] not null default '{}',
    local_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_diary_id_family unique (id, family_id)
);

create table if not exists public.diary_comments (
    id uuid primary key default gen_random_uuid(),
    diary_id uuid not null,
    family_id uuid not null,
    user_id uuid references auth.users(id) on delete set null,
    author text not null,
    text text not null,
    created_at timestamptz not null default now(),
    constraint fk_comment_diary_family foreign key (diary_id, family_id) references public.diary(id, family_id) on delete cascade
);

alter table public.diary add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.diary add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.diary add column if not exists child text not null default 'child1';
alter table public.diary add column if not exists date date not null default current_date;
alter table public.diary add column if not exists time text;
alter table public.diary add column if not exists mood text not null default '😊';
alter table public.diary add column if not exists title text not null default '다이어리';
alter table public.diary add column if not exists text text;
alter table public.diary add column if not exists image_paths text[] not null default '{}';
alter table public.diary add column if not exists reactions text[] not null default '{}';
alter table public.diary add column if not exists local_id text;
alter table public.diary add column if not exists created_at timestamptz not null default now();
alter table public.diary add column if not exists updated_at timestamptz not null default now();

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'uq_diary_id_family'
          and conrelid = 'public.diary'::regclass
    ) then
        alter table public.diary add constraint uq_diary_id_family unique (id, family_id);
    end if;
end $$;

alter table public.diary_comments add column if not exists diary_id uuid;
alter table public.diary_comments add column if not exists family_id uuid;
alter table public.diary_comments add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.diary_comments add column if not exists author text not null default '가족';
alter table public.diary_comments add column if not exists text text not null default '';
alter table public.diary_comments add column if not exists created_at timestamptz not null default now();

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'fk_comment_diary_family'
          and conrelid = 'public.diary_comments'::regclass
    ) then
        execute 'alter table public.diary_comments add constraint fk_comment_diary_family foreign key (diary_id, family_id) references public.diary(id, family_id) on delete cascade';
    end if;
end $$;

create index if not exists idx_diary_family_date on public.diary(family_id, date desc, created_at desc);
create index if not exists idx_diary_comments_diary on public.diary_comments(diary_id, family_id, created_at);

-- 6. 기존 앱 기본 테이블이 없는 새 Supabase 프로젝트를 위한 안전 생성
create table if not exists public.schedule (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    category text,
    day_of_week text not null,
    start_time time not null,
    pickup_agent text,
    drop_agent text,
    is_urgent boolean default false,
    is_early boolean default false,
    location text,
    contact_name text,
    contact_phone text,
    child_id varchar(50) default 'child1',
    created_at timestamptz not null default now()
);

create table if not exists public.payment (
    id uuid primary key default gen_random_uuid(),
    source text not null,
    amount integer not null default 0,
    method text not null default '미지정',
    payment_day integer not null default 1,
    discount_info text,
    is_completed boolean default false,
    child_id varchar(50) default 'child1',
    created_at timestamptz not null default now()
);

create table if not exists public.asset (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    balance integer not null default 0,
    last_updated timestamptz default timezone('utc'::text, now()),
    created_at timestamptz not null default now()
);

create table if not exists public.ops (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    execution_date date not null,
    description text,
    priority text default 'MEDIUM',
    status text default 'PENDING',
    child_id varchar(50) default 'child1',
    created_at timestamptz not null default now()
);

create table if not exists public.opsparticipant (
    id uuid primary key default gen_random_uuid(),
    ops_id uuid references public.ops(id) on delete cascade,
    agent_id text not null,
    is_assigned boolean default false,
    created_at timestamptz not null default now()
);

create table if not exists public.opschecklist (
    id uuid primary key default gen_random_uuid(),
    ops_id uuid references public.ops(id) on delete cascade,
    task text not null,
    is_checked boolean default false,
    created_at timestamptz not null default now()
);

create table if not exists public.transactionhistory (
    id uuid primary key default gen_random_uuid(),
    payment_id uuid references public.payment(id) on delete cascade,
    month text not null,
    date_formatted text not null,
    source text not null,
    amount integer not null default 0,
    method text not null default '',
    child_id varchar(50) default 'child1',
    created_at timestamptz default timezone('utc'::text, now())
);

create table if not exists public.notice (
    id uuid primary key default gen_random_uuid(),
    text text not null,
    is_checked boolean default false,
    created_at timestamptz default timezone('utc'::text, now())
);

create table if not exists public.dailytasks (
    id uuid primary key default gen_random_uuid(),
    task_name text not null,
    is_completed boolean default false,
    assigned_date date not null,
    child_id text not null default 'child1',
    created_at timestamptz default timezone('utc'::text, now())
);

-- 7. 기존 테이블 family_id/user_id 컬럼 보강
alter table public.schedule add column if not exists contact_name text;
alter table public.schedule add column if not exists contact_phone text;
alter table public.schedule add column if not exists child_id varchar(50) default 'child1';
alter table public.payment add column if not exists child_id varchar(50) default 'child1';
alter table public.ops add column if not exists child_id varchar(50) default 'child1';
alter table public.transactionhistory add column if not exists child_id varchar(50) default 'child1';

alter table public.schedule add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.payment add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.asset add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.ops add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.opschecklist add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.opsparticipant add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.transactionhistory add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.notice add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.dailytasks add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table public.schedule add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.payment add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.asset add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.ops add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.opschecklist add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.opsparticipant add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.transactionhistory add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.notice add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.dailytasks add column if not exists family_id uuid references public.families(id) on delete cascade;

-- 8. 기존 user_id 기반 클라우드 데이터 백필
with existing_users as (
    select user_id from public.schedule where user_id is not null
    union select user_id from public.payment where user_id is not null
    union select user_id from public.asset where user_id is not null
    union select user_id from public.ops where user_id is not null
    union select user_id from public.transactionhistory where user_id is not null
    union select user_id from public.notice where user_id is not null
    union select user_id from public.dailytasks where user_id is not null
),
users_without_family as (
    select eu.user_id
    from existing_users eu
    left join public.family_members fm on fm.user_id = eu.user_id
    where fm.user_id is null
),
created_families as (
    insert into public.families (name, invite_code, created_by)
    select
        '가족 스케줄러',
        'FA-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4)) || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4)),
        user_id
    from users_without_family
    returning id, created_by
)
insert into public.family_members (user_id, family_id, role, display_name)
select created_by, id, 'owner', '보호자'
from created_families
on conflict (user_id) do nothing;

update public.schedule t set family_id = fm.family_id
from public.family_members fm
where t.family_id is null and t.user_id = fm.user_id;

update public.payment t set family_id = fm.family_id
from public.family_members fm
where t.family_id is null and t.user_id = fm.user_id;

update public.asset t set family_id = fm.family_id
from public.family_members fm
where t.family_id is null and t.user_id = fm.user_id;

update public.ops t set family_id = fm.family_id
from public.family_members fm
where t.family_id is null and t.user_id = fm.user_id;

update public.transactionhistory t set family_id = fm.family_id
from public.family_members fm
where t.family_id is null and t.user_id = fm.user_id;

update public.notice t set family_id = fm.family_id
from public.family_members fm
where t.family_id is null and t.user_id = fm.user_id;

update public.dailytasks t set family_id = fm.family_id
from public.family_members fm
where t.family_id is null and t.user_id = fm.user_id;

update public.opschecklist c set family_id = o.family_id
from public.ops o
where c.family_id is null and c.ops_id = o.id;

update public.opsparticipant p set family_id = o.family_id
from public.ops o
where p.family_id is null and p.ops_id = o.id;

-- 9. API 접근 권한 설정
grant select, insert, update, delete on public.families to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.diary to authenticated;
grant select, insert, update, delete on public.diary_comments to authenticated;
grant select, insert, update, delete on public.schedule to authenticated;
grant select, insert, update, delete on public.payment to authenticated;
grant select, insert, update, delete on public.asset to authenticated;
grant select, insert, update, delete on public.ops to authenticated;
grant select, insert, update, delete on public.opschecklist to authenticated;
grant select, insert, update, delete on public.opsparticipant to authenticated;
grant select, insert, update, delete on public.transactionhistory to authenticated;
grant select, insert, update, delete on public.notice to authenticated;
grant select, insert, update, delete on public.dailytasks to authenticated;

-- 10. RLS 활성화
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.diary enable row level security;
alter table public.diary_comments enable row level security;
alter table public.schedule enable row level security;
alter table public.payment enable row level security;
alter table public.asset enable row level security;
alter table public.ops enable row level security;
alter table public.opschecklist enable row level security;
alter table public.opsparticipant enable row level security;
alter table public.transactionhistory enable row level security;
alter table public.notice enable row level security;
alter table public.dailytasks enable row level security;

-- 11. 기존 정책 정리
drop policy if exists "Allow authenticated full access to Schedule" on public.schedule;
drop policy if exists "Allow authenticated full access to Payment" on public.payment;
drop policy if exists "Allow authenticated full access to Asset" on public.asset;
drop policy if exists "Allow authenticated full access to Ops" on public.ops;
drop policy if exists "Allow authenticated full access to OpsChecklist" on public.opschecklist;
drop policy if exists "Allow authenticated full access to OpsParticipant" on public.opsparticipant;
drop policy if exists "Allow authenticated full access to TransactionHistory" on public.transactionhistory;
drop policy if exists "Allow authenticated full access to Notice" on public.notice;
drop policy if exists "Users can only access their own Schedule" on public.schedule;
drop policy if exists "Users can only access their own Payment" on public.payment;
drop policy if exists "Users can only access their own Asset" on public.asset;
drop policy if exists "Users can only access their own Ops" on public.ops;
drop policy if exists "Users can only access their own OpsChecklist" on public.opschecklist;
drop policy if exists "Users can only access their own OpsParticipant" on public.opsparticipant;
drop policy if exists "Users can only access their own TransactionHistory" on public.transactionhistory;
drop policy if exists "Users can only access their own Notice" on public.notice;
drop policy if exists "Users can only access their own dailytasks" on public.dailytasks;
drop policy if exists "family_all_Schedule" on public.schedule;
drop policy if exists "family_all_Payment" on public.payment;
drop policy if exists "family_all_Asset" on public.asset;
drop policy if exists "family_all_Ops" on public.ops;
drop policy if exists "family_all_OpsChecklist" on public.opschecklist;
drop policy if exists "family_all_OpsParticipant" on public.opsparticipant;
drop policy if exists "family_all_TransactionHistory" on public.transactionhistory;
drop policy if exists "family_all_Notice" on public.notice;
drop policy if exists "family_all_dailytasks" on public.dailytasks;
drop policy if exists "authenticated_select_families" on public.families;
drop policy if exists "authenticated_insert_families" on public.families;
drop policy if exists "authenticated_update_families" on public.families;
drop policy if exists "authenticated_select_family_members" on public.family_members;
drop policy if exists "authenticated_insert_family_members" on public.family_members;
drop policy if exists "authenticated_delete_family_members" on public.family_members;
drop policy if exists "authenticated_all_diary" on public.diary;
drop policy if exists "authenticated_all_diary_comments" on public.diary_comments;

-- 12. 가족/RLS 정책
create policy "authenticated_select_families" on public.families
    for select to authenticated
    using (private.is_family_member(id) or created_by = (select auth.uid()));

create policy "authenticated_insert_families" on public.families
    for insert to authenticated
    with check (created_by = (select auth.uid()));

create policy "authenticated_update_families" on public.families
    for update to authenticated
    using (private.is_family_member(id) or created_by = (select auth.uid()))
    with check (private.is_family_member(id) or created_by = (select auth.uid()));

create policy "authenticated_select_family_members" on public.family_members
    for select to authenticated
    using (private.is_family_member(family_id));

-- 직접 insert는 본인이 방금 만든 가족의 owner 등록에만 허용합니다.
-- 초대 코드 합류는 public.join_family_by_code() RPC만 사용합니다.
create policy "authenticated_insert_family_members" on public.family_members
    for insert to authenticated
    with check (
        user_id = (select auth.uid())
        and role = 'owner'
        and exists (
            select 1
            from public.families f
            where f.id = family_id
              and f.created_by = (select auth.uid())
        )
    );

create policy "authenticated_delete_family_members" on public.family_members
    for delete to authenticated
    using (user_id = (select auth.uid()));

create policy "authenticated_all_diary" on public.diary
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (private.is_family_member(family_id));

create policy "authenticated_all_diary_comments" on public.diary_comments
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (
        private.is_family_member(family_id)
        and exists (
            select 1
            from public.diary d
            where d.id = diary_id
              and d.family_id = diary_comments.family_id
        )
    );

create policy "family_all_Schedule" on public.schedule
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (private.is_family_member(family_id));

create policy "family_all_Payment" on public.payment
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (private.is_family_member(family_id));

create policy "family_all_Asset" on public.asset
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (private.is_family_member(family_id));

create policy "family_all_Ops" on public.ops
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (private.is_family_member(family_id));

create policy "family_all_OpsChecklist" on public.opschecklist
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (private.is_family_member(family_id));

create policy "family_all_OpsParticipant" on public.opsparticipant
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (private.is_family_member(family_id));

create policy "family_all_TransactionHistory" on public.transactionhistory
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (private.is_family_member(family_id));

create policy "family_all_Notice" on public.notice
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (private.is_family_member(family_id));

create policy "family_all_dailytasks" on public.dailytasks
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (private.is_family_member(family_id));

-- 13. Private Storage bucket and policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'diary-photos',
    'diary-photos',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "diary_photos_select_family" on storage.objects;
drop policy if exists "diary_photos_insert_family" on storage.objects;
drop policy if exists "diary_photos_update_family" on storage.objects;
drop policy if exists "diary_photos_delete_family" on storage.objects;

create policy "diary_photos_select_family" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'diary-photos'
        and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and private.is_family_member((storage.foldername(name))[1]::uuid)
    );

create policy "diary_photos_insert_family" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'diary-photos'
        and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and private.is_family_member((storage.foldername(name))[1]::uuid)
    );

create policy "diary_photos_update_family" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'diary-photos'
        and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and private.is_family_member((storage.foldername(name))[1]::uuid)
    )
    with check (
        bucket_id = 'diary-photos'
        and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and private.is_family_member((storage.foldername(name))[1]::uuid)
    );

create policy "diary_photos_delete_family" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'diary-photos'
        and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and private.is_family_member((storage.foldername(name))[1]::uuid)
    );

-- 14. 초대 코드 기반 가족 합류 RPC
create or replace function public.join_family_by_code(code_input text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    target_family_id uuid;
begin
    if auth.uid() is null then
        raise exception '로그인이 필요합니다.';
    end if;

    select id
    into target_family_id
    from public.families
    where invite_code = upper(trim(code_input));

    if target_family_id is null then
        raise exception '유효하지 않은 초대 코드입니다.';
    end if;

    if exists (select 1 from public.family_members where user_id = auth.uid()) then
        raise exception '이미 참여 중인 가족 그룹이 존재합니다. 먼저 탈퇴해 주십시오.';
    end if;

    insert into public.family_members (user_id, family_id, role, display_name)
    values (auth.uid(), target_family_id, 'member', '보호자');

    return true;
end;
$$;

revoke all on function public.join_family_by_code(text) from public;
revoke execute on function public.join_family_by_code(text) from anon;
grant execute on function public.join_family_by_code(text) to authenticated;

-- 15. Realtime publication
do $$
declare
    realtime_table_name text;
begin
    foreach realtime_table_name in array array['diary', 'schedule', 'dailytasks']
    loop
        if not exists (
            select 1
            from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = realtime_table_name
        ) then
            execute format('alter publication supabase_realtime add table public.%I', realtime_table_name);
        end if;
    end loop;
end $$;

commit;
