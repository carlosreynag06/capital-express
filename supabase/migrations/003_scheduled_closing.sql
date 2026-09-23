create extension if not exists pg_cron with schema pg_catalog;
create function public._close_due_periods() returns void language plpgsql security definer set search_path=public as $$
declare l record;
begin
 for l in select id from loans where status not in ('paid','cancelled') and next_due<business_today() order by id loop
  perform _accrue(l.id,business_today());
 end loop;
end $$;
revoke execute on function public._close_due_periods() from public,anon,authenticated;
-- Santo Domingo is UTC-4 year-round. Also caught up on every authenticated snapshot.
select cron.schedule('capital-express-close-periods','5 4 * * *','select public._close_due_periods()');
