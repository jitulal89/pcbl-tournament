-- Run after schema.sql. Creates the PCBL tournament, 6 teams, and finalized schedule.
with t as (
 insert into public.tournaments(name,final_start,prize_distribution_at)
 values ('Park Connect Badminton League','2026-08-30 17:30:00+05:30','2026-08-30 19:45:00+05:30')
 returning id
), team_data(code,name,captain_name) as (
 values ('A','Team A','Himanshu'),('B','Team B','Parth'),('C','Team C','Shailesh'),('D','Team D','Mayank'),('E','Team E','Sanket'),('F','Team F','Aish')
) insert into public.teams(tournament_id,code,name,captain_name)
select t.id,d.code,d.name,d.captain_name from t cross join team_data d;

insert into public.players(team_id,full_name)
select id,captain_name from public.teams where captain_name is not null;

-- Fixtures + backup slots + Sunday final
with t as (select id from public.tournaments order by created_at desc limit 1), x(day,start_t,end_t,a,b,kind) as (
 values
 ('Saturday','7:30 AM','8:30 AM','D','E','league'),('Saturday','8:30 AM','9:30 AM','E','F','league'),
 ('Saturday','9:30 AM','10:30 AM','F','D','league'),('Saturday','10:30 AM','11:30 AM','B','D','league'),
 ('Saturday','11:30 AM','12:30 PM','A','C','league'),('Saturday','12:30 PM','1:30 PM','A','B','league'),
 ('Saturday','1:30 PM','2:30 PM','B','C','league'),('Saturday','2:30 PM','3:30 PM','A','E','league'),
 ('Saturday','9:30 PM','10:30 PM',null,null,'backup'),
 ('Sunday','7:30 AM','8:30 AM','C','E','league'),('Sunday','8:30 AM','9:30 AM','A','D','league'),
 ('Sunday','9:30 AM','10:30 AM','B','E','league'),('Sunday','10:30 AM','11:30 AM','A','F','league'),
 ('Sunday','11:30 AM','12:30 PM','C','D','league'),('Sunday','12:30 PM','1:30 PM','C','F','league'),
 ('Sunday','1:30 PM','2:30 PM','B','F','league'),('Sunday','2:30 PM','3:30 PM',null,null,'backup'),
 ('Sunday','3:30 PM','4:30 PM',null,null,'backup'),('Sunday','5:30 PM','7:30 PM',null,null,'final')
) insert into public.matches(tournament_id,match_day,start_time,end_time,team1_id,team2_id,match_type,status)
select t.id,x.day,x.start_t,x.end_t,ta.id,tb.id,x.kind,case when x.kind='backup' then 'backup' else 'scheduled' end
from t cross join x left join public.teams ta on ta.tournament_id=t.id and ta.code=x.a left join public.teams tb on tb.tournament_id=t.id and tb.code=x.b;
