begin;

-- Server-side catalog and orders: the browser sends product ids and quantities only.
create table private.products (
    id text primary key,
    name text not null check (length(name) between 1 and 80),
    price integer not null check (price between 0 and 10000),
    active boolean not null default true
);
alter table private.products enable row level security;
revoke all on private.products from public, anon, authenticated;
grant all on private.products to service_role;

-- Starting prices are the ones shown on the page (mock shop data, owner-accepted).
insert into private.products(id, name, price) values
    ('max_1', 'ข้าวหลามถั่วดำระเบิดเตา (ต้นตำรับ)', 45),
    ('max_2', 'ข้าวหลามช็อตมะพร้าวน้ำหอม', 40),
    ('max_3', 'ข้าวหลามเผือกหอมกวนกะทิเยิ้ม', 50),
    ('max_4', 'ข้าวหลามสังขยาลาวาไข่เป็ด', 55),
    ('max_5', 'ข้าวหลามข้าวโพดหวานกะทิสด', 42),
    ('max_6', 'ข้าวหลามถั่วแดงกวนนมสด', 38),
    ('max_7', 'ข้าวหลามงาดำโบราณเตาถ่าน', 45),
    ('max_8', 'ข้าวหลามทุเรียนหมอนทองพรีเมียม', 65);

create table private.shop_orders (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    order_ref text not null check (order_ref ~ '^MAX-[0-9]{6}$'),
    request jsonb not null,
    result jsonb not null,
    created_at timestamptz not null default now(),
    unique (user_id, order_ref)
);
create index shop_orders_user_created_idx on private.shop_orders(user_id, created_at);
alter table private.shop_orders enable row level security;
revoke all on private.shop_orders from public, anon, authenticated;
grant all on private.shop_orders to service_role;

-- Returns the stored order, or null when the request is not acceptable.
create function public.server_create_order(member_id uuid, order_ref text, lines jsonb, shipping_code text, coupon_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
    line jsonb;
    qty numeric;
    product record;
    seen text[] := '{}';
    items jsonb := '[]';
    subtotal integer := 0;
    discount integer := 0;
    shipping integer;
    coupon text := upper(trim(coalesce(coupon_code, '')));
    wanted jsonb;
    stored record;
    result jsonb;
begin
    shipping := case shipping_code when 'express' then 50 when 'cold' then 85 when 'pickup' then 0 end;
    if member_id is null or shipping is null or order_ref is null or order_ref !~ '^MAX-[0-9]{6}$'
       or length(coupon) > 40 or lines is null or jsonb_typeof(lines) <> 'array' then
        return null;
    end if;
    if jsonb_array_length(lines) not between 1 and 20 then return null; end if;
    wanted := jsonb_build_object('lines', lines, 'shipping', shipping_code, 'coupon', coupon);

    perform pg_advisory_xact_lock(hashtext('maxmuxsix_order_' || member_id::text));
    select o.request, o.result into stored from private.shop_orders o
        where o.user_id = member_id and o.order_ref = order_ref;
    if found then
        return case when stored.request = wanted then stored.result end;
    end if;

    for line in select value from jsonb_array_elements(lines) loop
        if jsonb_typeof(line) <> 'object' or coalesce(jsonb_typeof(line -> 'qty'), '') <> 'number' then return null; end if;
        qty := (line ->> 'qty')::numeric;
        if qty <> trunc(qty) or qty not between 1 and 99 or (line ->> 'id') = any(seen) then return null; end if;
        select p.id, p.name, p.price into product from private.products p
            where p.id = line ->> 'id' and p.active;
        if not found then return null; end if;
        seen := seen || product.id;
        items := items || jsonb_build_object('id', product.id, 'name', product.name, 'qty', qty::integer, 'price', product.price);
        subtotal := subtotal + product.price * qty::integer;
    end loop;

    -- 10% rounded half up, matching Math.round on the page.
    if (coupon = 'MAX10' and subtotal >= 150) or coupon = 'WELCOME10'
       or exists (select 1 from public.profiles p where p.referral_code = coupon and p.id <> member_id) then
        discount := (subtotal + 5) / 10;
    end if;

    if (select count(*) from private.shop_orders o
        where o.user_id = member_id and o.created_at > now() - interval '24 hours') >= 20 then
        return null;
    end if;

    result := jsonb_build_object('id', order_ref, 'items', items, 'subtotal', subtotal,
        'discountAmount', discount, 'shippingCost', shipping, 'total', subtotal - discount + shipping);
    insert into private.shop_orders(user_id, order_ref, request, result)
        values (member_id, order_ref, wanted, result);
    return result;
end;
$$;
revoke all on function public.server_create_order(uuid, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.server_create_order(uuid, text, jsonb, text, text) to service_role;

commit;
