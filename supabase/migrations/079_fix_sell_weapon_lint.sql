create or replace function public.sell_weapon(target_weapon_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  sale_price integer := 20;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;

  perform 1
  from public.character_weapons
  where id = target_weapon_id and character_id = target_character.id
  for update;
  if not found then raise exception 'weapon_not_owned'; end if;

  if exists (select 1 from public.character_equipment where weapon_id = target_weapon_id) then
    raise exception 'equipped_weapon_cannot_be_sold';
  end if;

  delete from public.character_weapons where id = target_weapon_id;
  update public.characters set credits = credits + sale_price where id = target_character.id returning * into target_character;

  return jsonb_build_object('character', to_jsonb(target_character), 'gained_credits', sale_price);
end;
$$;
