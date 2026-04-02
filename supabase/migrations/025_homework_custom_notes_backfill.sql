-- Safety migration for environments where 015 was not applied.
alter table if exists homework_user_custom_tasks
add column if not exists notes text;
