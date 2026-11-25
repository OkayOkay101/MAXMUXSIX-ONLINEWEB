begin;

-- Order/welcome mail shares the auth-mail relay, so it is capped here to leave
-- signup and password-reset mail enough relay and Gmail capacity.
create table private.mail_log (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    kind text not null check (kind in ('order', 'welcome')),
    created_at timestamptz not null default now()
);
create index mail_log_created_idx on private.mail_log(created_at);
alter table private.mail_log enable row level security;
revoke all on private.mail_log from public, anon, authenticated;

create function public.server_claim_mail_send(member_id uuid, mail_kind text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
    if mail_kind is null or mail_kind not in ('order', 'welcome') then
        raise exception 'Unknown mail kind';
    end if;
    perform pg_advisory_xact_lock(hashtext('maxmuxsix_mail_log'));
    delete from private.mail_log where created_at < now() - interval '7 days';
    if (select count(*) from private.mail_log where created_at > now() - interval '24 hours') >= 20
       or (select count(*) from private.mail_log l
           where l.user_id = member_id and l.kind = mail_kind and l.created_at > now() - interval '24 hours')
          >= (case mail_kind when 'order' then 5 else 1 end) then
        return false;
    end if;
    insert into private.mail_log(user_id, kind) values (member_id, mail_kind);
    return true;
end;
$$;
revoke all on function public.server_claim_mail_send(uuid, text) from public, anon, authenticated;
grant execute on function public.server_claim_mail_send(uuid, text) to service_role;

-- Event-trigger helper: the trigger does not need callers to hold EXECUTE.
do $$ begin
    if to_regprocedure('public.rls_auto_enable()') is not null then
        revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
    end if;
end $$;

commit;
