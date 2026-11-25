-- Apply once in Supabase SQL Editor or with `supabase db push`.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null check (length(name) between 1 and 100),
    phone text not null default '' check (length(phone) <= 30),
    address text not null default '' check (length(address) <= 1000),
    referral_code text not null unique,
    referred_by uuid references public.profiles(id) on delete set null,
    consent_at timestamptz,
    created_at timestamptz not null default now()
);
create index profiles_referred_by_idx on public.profiles(referred_by);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy own_profile_read on public.profiles for select to authenticated using (id = (select auth.uid()));

create table private.member_admins (
    user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.member_admins enable row level security;
revoke all on private.member_admins from public, anon, authenticated;
grant all on private.member_admins to service_role;

-- A service-only RPC avoids exposing the private schema through PostgREST.
create function public.server_member_admin_ids(member_ids uuid[]) returns setof uuid
language sql stable security definer set search_path = '' as $$
    select user_id from private.member_admins where user_id = any(member_ids);
$$;
revoke all on function public.server_member_admin_ids(uuid[]) from public, anon, authenticated;
grant execute on function public.server_member_admin_ids(uuid[]) to service_role;

create function public.is_member_admin() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from private.member_admins a
        join public.profiles p on p.id = a.user_id
        join auth.users u on u.id = a.user_id
        where a.user_id = auth.uid() and u.email_confirmed_at is not null and p.consent_at is not null
    );
$$;
revoke all on function public.is_member_admin() from public, anon;
grant execute on function public.is_member_admin() to authenticated;

create function public.member_referral_count() returns integer
language sql stable security definer set search_path = '' as $$
    select count(*)::integer from public.profiles p join auth.users u on p.id = u.id
    where p.referred_by = auth.uid() and u.email_confirmed_at is not null;
$$;
revoke all on function public.member_referral_count() from public, anon;
grant execute on function public.member_referral_count() to authenticated;

create function public.accept_member_terms() returns void
language plpgsql security definer set search_path = '' as $$
begin
    if not exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then
        raise exception 'Verified account required';
    end if;
    update public.profiles set consent_at = coalesce(consent_at, now()) where id = auth.uid();
    if not found then raise exception 'Profile missing'; end if;
end;
$$;
revoke all on function public.accept_member_terms() from public, anon;
grant execute on function public.accept_member_terms() to authenticated;

create function private.create_member_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    member_name text;
    member_phone text;
    member_address text;
    referrer uuid;
begin
    member_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'สมาชิก');
    member_phone := coalesce(new.raw_user_meta_data ->> 'phone', '');
    member_address := coalesce(new.raw_user_meta_data ->> 'address', '');
    if length(member_name) > 100 or length(member_phone) > 30 or length(member_address) > 1000 then
        raise exception 'Profile fields too long';
    end if;
    select p.id into referrer from public.profiles p join auth.users u on p.id = u.id
    where p.referral_code = upper(trim(new.raw_user_meta_data ->> 'referrer_code'))
      and u.email_confirmed_at is not null;
    for attempt in 1..10 loop
        begin
            insert into public.profiles(id, name, phone, address, referral_code, referred_by, consent_at)
            values (new.id, member_name, member_phone, member_address,
                'MAX' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), referrer,
                case when new.raw_user_meta_data -> 'consent' = 'true'::jsonb then now() else null end);
            return new;
        exception when unique_violation then
            if attempt = 10 then raise; end if;
        end;
    end loop;
    return new;
end;
$$;
revoke all on function private.create_member_profile() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_member_profile();

commit;
