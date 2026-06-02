-- =====================================================================
-- FAMILY SCHEDULER - Local-first sync metadata and atomic guest snapshot
-- Codex, 2026-06-02
-- =====================================================================
-- 목적:
-- - 로컬 우선 앱에서 가족 공유 전환 시 중복 업로드와 부분 실패를 줄입니다.
-- - schedule/payment/asset/ops/dailytasks/transactionhistory/notice에 local_id,
--   updated_at, deleted_at을 보강합니다.
-- - 가족 단위 자녀 프로필 테이블(family_children)을 추가합니다.
-- - 로컬 스냅샷 JSON을 단일 DB 트랜잭션에서 upsert하는 RPC를 제공합니다.

begin;

create extension if not exists "pgcrypto";

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- 1. Local-first sync metadata columns
alter table public.schedule add column if not exists local_id text;
alter table public.schedule add column if not exists updated_at timestamptz not null default now();
alter table public.schedule add column if not exists deleted_at timestamptz;

alter table public.payment add column if not exists local_id text;
alter table public.payment add column if not exists updated_at timestamptz not null default now();
alter table public.payment add column if not exists deleted_at timestamptz;

alter table public.asset add column if not exists local_id text;
alter table public.asset add column if not exists updated_at timestamptz not null default now();
alter table public.asset add column if not exists deleted_at timestamptz;

alter table public.ops add column if not exists local_id text;
alter table public.ops add column if not exists updated_at timestamptz not null default now();
alter table public.ops add column if not exists deleted_at timestamptz;

alter table public.dailytasks add column if not exists local_id text;
alter table public.dailytasks add column if not exists updated_at timestamptz not null default now();
alter table public.dailytasks add column if not exists deleted_at timestamptz;

alter table public.transactionhistory add column if not exists local_id text;
alter table public.transactionhistory add column if not exists updated_at timestamptz not null default now();
alter table public.transactionhistory add column if not exists deleted_at timestamptz;

alter table public.notice add column if not exists local_id text;
alter table public.notice add column if not exists updated_at timestamptz not null default now();
alter table public.notice add column if not exists deleted_at timestamptz;

-- 2. Family-wide child profile table
create table if not exists public.family_children (
    id uuid primary key default gen_random_uuid(),
    family_id uuid not null references public.families(id) on delete cascade,
    child_id text not null check (child_id ~ '^child[1-3]$'),
    display_name text not null,
    sort_order integer not null default 1,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (family_id, child_id)
);

grant select, insert, update, delete on public.family_children to authenticated;
alter table public.family_children enable row level security;

drop policy if exists "family_all_family_children" on public.family_children;
create policy "family_all_family_children" on public.family_children
    for all to authenticated
    using (private.is_family_member(family_id))
    with check (private.is_family_member(family_id));

-- 3. Unique constraints for idempotent local sync
do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'uq_schedule_family_local_id' and conrelid = 'public.schedule'::regclass) then
        alter table public.schedule add constraint uq_schedule_family_local_id unique (family_id, local_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'uq_payment_family_local_id' and conrelid = 'public.payment'::regclass) then
        alter table public.payment add constraint uq_payment_family_local_id unique (family_id, local_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'uq_asset_family_local_id' and conrelid = 'public.asset'::regclass) then
        alter table public.asset add constraint uq_asset_family_local_id unique (family_id, local_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'uq_ops_family_local_id' and conrelid = 'public.ops'::regclass) then
        alter table public.ops add constraint uq_ops_family_local_id unique (family_id, local_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'uq_dailytasks_family_local_id' and conrelid = 'public.dailytasks'::regclass) then
        alter table public.dailytasks add constraint uq_dailytasks_family_local_id unique (family_id, local_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'uq_transactionhistory_family_local_id' and conrelid = 'public.transactionhistory'::regclass) then
        alter table public.transactionhistory add constraint uq_transactionhistory_family_local_id unique (family_id, local_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'uq_notice_family_local_id' and conrelid = 'public.notice'::regclass) then
        alter table public.notice add constraint uq_notice_family_local_id unique (family_id, local_id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'uq_diary_family_local_id' and conrelid = 'public.diary'::regclass) then
        alter table public.diary add constraint uq_diary_family_local_id unique (family_id, local_id);
    end if;
end $$;

create index if not exists idx_family_children_family_order on public.family_children(family_id, sort_order);

-- 4. Updated-at triggers
do $$
declare
    table_name text;
    trigger_name text;
begin
    foreach table_name in array array[
        'schedule',
        'payment',
        'asset',
        'ops',
        'dailytasks',
        'transactionhistory',
        'notice',
        'diary',
        'family_children'
    ]
    loop
        trigger_name := 'trg_' || table_name || '_set_updated_at';
        if not exists (
            select 1
            from pg_trigger
            where tgname = trigger_name
              and tgrelid = ('public.' || table_name)::regclass
        ) then
            execute format(
                'create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
                trigger_name,
                table_name
            );
        end if;
    end loop;
end $$;

-- 5. Atomic local guest snapshot sync
create or replace function public.sync_guest_snapshot(snapshot_input jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    actor_id uuid;
    target_family_id uuid;
    row_data jsonb;
    row_local_id text;
    result jsonb := '{}'::jsonb;
begin
    actor_id := auth.uid();
    if actor_id is null then
        raise exception '로그인이 필요합니다.' using errcode = '28000';
    end if;

    target_family_id := nullif(snapshot_input->>'family_id', '')::uuid;
    if target_family_id is null or not private.is_family_member(target_family_id) then
        raise exception '가족 공유 연결이 필요합니다.' using errcode = '42501';
    end if;

    for row_data in
        select value from jsonb_array_elements(coalesce(snapshot_input->'children', '[]'::jsonb))
    loop
        row_local_id := nullif(row_data->>'child_id', '');
        if row_local_id is null then
            continue;
        end if;

        insert into public.family_children (
            family_id,
            child_id,
            display_name,
            sort_order,
            is_active
        )
        values (
            target_family_id,
            row_local_id,
            coalesce(nullif(row_data->>'display_name', ''), row_local_id),
            coalesce((row_data->>'sort_order')::integer, 1),
            coalesce((row_data->>'is_active')::boolean, true)
        )
        on conflict (family_id, child_id) do update
        set display_name = excluded.display_name,
            sort_order = excluded.sort_order,
            is_active = excluded.is_active;
    end loop;

    for row_data in
        select value from jsonb_array_elements(coalesce(snapshot_input #> '{tables,schedule}', '[]'::jsonb))
    loop
        row_local_id := nullif(coalesce(row_data->>'local_id', row_data->>'localId', row_data->>'id'), '');
        if row_local_id is null then continue; end if;

        insert into public.schedule (
            family_id, user_id, local_id, title, day_of_week, start_time,
            pickup_agent, drop_agent, location, contact_name, contact_phone,
            is_urgent, is_early, child_id
        )
        values (
            target_family_id, actor_id, row_local_id, coalesce(row_data->>'title', '일정'),
            coalesce(row_data->>'day_of_week', '월'), (coalesce(row_data->>'start_time', '09:00:00'))::time,
            row_data->>'pickup_agent', row_data->>'drop_agent', row_data->>'location',
            row_data->>'contact_name', row_data->>'contact_phone',
            coalesce((row_data->>'is_urgent')::boolean, false),
            coalesce((row_data->>'is_early')::boolean, false),
            coalesce(row_data->>'child_id', 'child1')
        )
        on conflict (family_id, local_id) do update
        set title = excluded.title,
            day_of_week = excluded.day_of_week,
            start_time = excluded.start_time,
            pickup_agent = excluded.pickup_agent,
            drop_agent = excluded.drop_agent,
            location = excluded.location,
            contact_name = excluded.contact_name,
            contact_phone = excluded.contact_phone,
            is_urgent = excluded.is_urgent,
            is_early = excluded.is_early,
            child_id = excluded.child_id,
            deleted_at = null;
    end loop;

    for row_data in
        select value from jsonb_array_elements(coalesce(snapshot_input #> '{tables,asset}', '[]'::jsonb))
    loop
        row_local_id := nullif(coalesce(row_data->>'local_id', row_data->>'localId', row_data->>'id'), '');
        if row_local_id is null then continue; end if;

        insert into public.asset (family_id, user_id, local_id, name, balance, last_updated)
        values (
            target_family_id,
            actor_id,
            row_local_id,
            coalesce(row_data->>'name', '자산'),
            coalesce((row_data->>'balance')::integer, 0),
            coalesce(nullif(row_data->>'last_updated', '')::timestamptz, timezone('utc'::text, now()))
        )
        on conflict (family_id, local_id) do update
        set name = excluded.name,
            balance = excluded.balance,
            last_updated = excluded.last_updated,
            deleted_at = null;
    end loop;

    for row_data in
        select value from jsonb_array_elements(coalesce(snapshot_input #> '{tables,payment}', '[]'::jsonb))
    loop
        row_local_id := nullif(coalesce(row_data->>'local_id', row_data->>'localId', row_data->>'id'), '');
        if row_local_id is null then continue; end if;

        insert into public.payment (
            family_id, user_id, local_id, source, amount, method, payment_day,
            discount_info, is_completed, child_id
        )
        values (
            target_family_id, actor_id, row_local_id, coalesce(row_data->>'source', '결제 내역'),
            coalesce((row_data->>'amount')::integer, 0), coalesce(row_data->>'method', '미지정'),
            coalesce((row_data->>'payment_day')::integer, 1),
            row_data->>'discount_info',
            coalesce((row_data->>'is_completed')::boolean, false),
            coalesce(row_data->>'child_id', 'child1')
        )
        on conflict (family_id, local_id) do update
        set source = excluded.source,
            amount = excluded.amount,
            method = excluded.method,
            payment_day = excluded.payment_day,
            discount_info = excluded.discount_info,
            is_completed = excluded.is_completed,
            child_id = excluded.child_id,
            deleted_at = null;
    end loop;

    for row_data in
        select value from jsonb_array_elements(coalesce(snapshot_input #> '{tables,ops}', '[]'::jsonb))
    loop
        row_local_id := nullif(coalesce(row_data->>'local_id', row_data->>'localId', row_data->>'id'), '');
        if row_local_id is null then continue; end if;

        insert into public.ops (
            family_id, user_id, local_id, title, execution_date, description,
            priority, status, child_id
        )
        values (
            target_family_id, actor_id, row_local_id, coalesce(row_data->>'title', '가족일정'),
            coalesce(nullif(row_data->>'execution_date', '')::date, current_date),
            row_data->>'description',
            coalesce(row_data->>'priority', 'MEDIUM'),
            coalesce(row_data->>'status', 'PENDING'),
            coalesce(row_data->>'child_id', 'child1')
        )
        on conflict (family_id, local_id) do update
        set title = excluded.title,
            execution_date = excluded.execution_date,
            description = excluded.description,
            priority = excluded.priority,
            status = excluded.status,
            child_id = excluded.child_id,
            deleted_at = null;
    end loop;

    for row_data in
        select value from jsonb_array_elements(coalesce(snapshot_input #> '{tables,dailytasks}', '[]'::jsonb))
    loop
        row_local_id := nullif(coalesce(row_data->>'local_id', row_data->>'localId', row_data->>'id'), '');
        if row_local_id is null then continue; end if;

        insert into public.dailytasks (
            family_id, user_id, local_id, task_name, is_completed, assigned_date, child_id
        )
        values (
            target_family_id, actor_id, row_local_id, coalesce(row_data->>'task_name', '할 일'),
            coalesce((row_data->>'is_completed')::boolean, false),
            coalesce(nullif(row_data->>'assigned_date', '')::date, current_date),
            coalesce(row_data->>'child_id', 'child1')
        )
        on conflict (family_id, local_id) do update
        set task_name = excluded.task_name,
            is_completed = excluded.is_completed,
            assigned_date = excluded.assigned_date,
            child_id = excluded.child_id,
            deleted_at = null;
    end loop;

    for row_data in
        select value from jsonb_array_elements(coalesce(snapshot_input #> '{tables,transactionhistory}', '[]'::jsonb))
    loop
        row_local_id := nullif(coalesce(row_data->>'local_id', row_data->>'localId', row_data->>'id'), '');
        if row_local_id is null then continue; end if;

        insert into public.transactionhistory (
            family_id, user_id, local_id, month, date_formatted, source, amount, method, child_id
        )
        values (
            target_family_id, actor_id, row_local_id,
            coalesce(row_data->>'month', to_char(current_date, 'YYYY-MM')),
            coalesce(row_data->>'date_formatted', to_char(current_date, 'MM.DD')),
            coalesce(row_data->>'source', '결제 내역'),
            coalesce((row_data->>'amount')::integer, 0),
            coalesce(row_data->>'method', ''),
            coalesce(row_data->>'child_id', 'child1')
        )
        on conflict (family_id, local_id) do update
        set month = excluded.month,
            date_formatted = excluded.date_formatted,
            source = excluded.source,
            amount = excluded.amount,
            method = excluded.method,
            child_id = excluded.child_id,
            deleted_at = null;
    end loop;

    for row_data in
        select value from jsonb_array_elements(coalesce(snapshot_input #> '{tables,notice}', '[]'::jsonb))
    loop
        row_local_id := nullif(coalesce(row_data->>'local_id', row_data->>'localId', row_data->>'id'), '');
        if row_local_id is null then continue; end if;

        insert into public.notice (family_id, user_id, local_id, text, is_checked)
        values (
            target_family_id, actor_id, row_local_id,
            coalesce(row_data->>'text', '알림'),
            coalesce((row_data->>'is_checked')::boolean, false)
        )
        on conflict (family_id, local_id) do update
        set text = excluded.text,
            is_checked = excluded.is_checked,
            deleted_at = null;
    end loop;

    result := jsonb_build_object(
        'ok', true,
        'family_id', target_family_id,
        'synced_at', now()
    );
    return result;
end;
$$;

revoke all on function public.sync_guest_snapshot(jsonb) from public;
revoke execute on function public.sync_guest_snapshot(jsonb) from anon;
grant execute on function public.sync_guest_snapshot(jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
