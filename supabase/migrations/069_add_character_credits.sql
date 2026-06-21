alter table public.characters
add column credits bigint not null default 0;

alter table public.characters
add constraint characters_credits_nonnegative_check
check (credits >= 0);
