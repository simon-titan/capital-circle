alter table if exists quizzes
add column if not exists quiz_mode text not null default 'multi_page'
check (quiz_mode in ('single_page', 'multi_page'));
