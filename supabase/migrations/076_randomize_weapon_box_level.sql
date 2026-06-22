create or replace function public.open_weapon_box()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  created_weapon public.character_weapons%rowtype;
  selected_weapon_type text;
  selected_weapon_level integer;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  if target_character.credits < 100 then raise exception 'insufficient_credits'; end if;

  selected_weapon_type := (array['longsword', 'greatsword', 'dagger', 'bow', 'wand', 'staff'])[floor(random() * 6)::integer + 1];
  selected_weapon_level := greatest(1, least(100, target_character.level + floor(random() * 7)::integer - 3));
  insert into public.character_weapons (character_id, weapon_type, weapon_level)
  values (target_character.id, selected_weapon_type, selected_weapon_level)
  returning * into created_weapon;

  update public.characters set credits = credits - 100 where id = target_character.id returning * into target_character;

  return jsonb_build_object(
    'character', to_jsonb(target_character),
    'weapon', jsonb_build_object(
      'id', created_weapon.id,
      'weapon_type', created_weapon.weapon_type,
      'weapon_level', created_weapon.weapon_level,
      'created_at', created_weapon.created_at
    )
  );
end;
$$;
