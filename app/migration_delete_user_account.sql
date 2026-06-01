-- FAMILY SCHEDULER - Account deletion RPC
-- Apply with Supabase SQL Editor or an admin/service database connection.

begin;

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    requesting_user_id uuid;
    single_member_family_ids uuid[];
begin
    requesting_user_id := auth.uid();

    if requesting_user_id is null then
        raise exception '로그인이 필요합니다.' using errcode = '28000';
    end if;

    select coalesce(array_agg(fm.family_id), '{}'::uuid[])
    into single_member_family_ids
    from public.family_members fm
    where fm.user_id = requesting_user_id
      and not exists (
          select 1
          from public.family_members other_members
          where other_members.family_id = fm.family_id
            and other_members.user_id <> requesting_user_id
      );

    if exists (
        select 1
        from storage.objects objects
        where objects.owner = requesting_user_id
    ) then
        raise exception '업로드된 사진 삭제가 먼저 필요합니다. 잠시 후 다시 시도해 주세요.' using errcode = 'P0001';
    end if;

    delete from public.families family
    where family.id = any(single_member_family_ids);

    delete from public.diary_comments
    where user_id = requesting_user_id;

    delete from public.diary
    where user_id = requesting_user_id;

    delete from public.schedule
    where user_id = requesting_user_id;

    delete from public.payment
    where user_id = requesting_user_id;

    delete from public.asset
    where user_id = requesting_user_id;

    delete from public.opschecklist
    where user_id = requesting_user_id;

    delete from public.opsparticipant
    where user_id = requesting_user_id;

    delete from public.ops
    where user_id = requesting_user_id;

    delete from public.transactionhistory
    where user_id = requesting_user_id;

    delete from public.notice
    where user_id = requesting_user_id;

    delete from public.dailytasks
    where user_id = requesting_user_id;

    delete from public.family_members
    where user_id = requesting_user_id;

    update public.families
    set created_by = null
    where created_by = requesting_user_id;

    delete from auth.users
    where id = requesting_user_id;

    if not found then
        raise exception '삭제할 계정을 찾을 수 없습니다.' using errcode = 'P0002';
    end if;
end;
$$;

revoke all on function public.delete_user_account() from public;
revoke execute on function public.delete_user_account() from anon;
grant execute on function public.delete_user_account() to authenticated;

notify pgrst, 'reload schema';

commit;
