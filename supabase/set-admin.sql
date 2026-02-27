-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FITPRO AGENDA PERSONAL — Definir Admin Principal          ║
-- ║  Execute no Supabase Dashboard → SQL Editor                ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1. Garante que semap.igor@gmail.com seja admin na tabela de perfis
--    (funciona tanto se o usuário já existe quanto após o primeiro login)
update public.profiles
set is_admin = true
where email = 'semap.igor@gmail.com';

-- 2. Atualiza a função de criação automática de perfil para conceder
--    admin ao email principal no momento do cadastro/primeiro login
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    new.email = 'semap.igor@gmail.com'
  )
  on conflict (id) do update
    set is_admin = (excluded.email = 'semap.igor@gmail.com' or public.profiles.is_admin);
  return new;
end;
$$ language plpgsql security definer;
