-- Supprime la table si elle existe déjà (utile pour réinitialiser)
drop table if exists messages;

-- Crée la table des messages
create table messages (
    id bigint primary key generated always as identity,
    role text not null check (role in ('assistant', 'user')), -- Restriction des valeurs possibles
    content text not null,
    timestamp bigint not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Crée un index sur le timestamp pour optimiser les requêtes d'ordre chronologique
create index messages_timestamp_idx on messages(timestamp);

-- Active la sécurité niveau ligne (RLS)
alter table messages enable row level security;

-- Crée une fonction pour mettre à jour automatiquement updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Crée un trigger pour mettre à jour automatiquement updated_at
create trigger update_messages_updated_at
    before update on messages
    for each row
    execute function update_updated_at_column();

-- Politique pour permettre à tout le monde de lire les messages
create policy "Messages are publicly readable"
    on messages
    for select
    to anon
    using (true);

-- Politique pour permettre à tout le monde d'insérer des messages
create policy "Anyone can insert messages"
    on messages
    for insert
    to anon
    with check (true);

-- Politique pour permettre à tout le monde de supprimer des messages
create policy "Anyone can delete messages"
    on messages
    for delete
    to anon
    using (true);

-- Ajoute un message de bienvenue initial
insert into messages (role, content, timestamp)
values (
    'assistant',
    'Bonjour ! Je suis l''agent de Synesia. Comment puis-je vous aider ?',
    extract(epoch from now()) * 1000
); 