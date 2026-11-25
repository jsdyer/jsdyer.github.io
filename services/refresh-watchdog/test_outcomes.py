import copy
import datetime as dt
import unittest
import watchdog as wd
from report_outcomes import assemble, observe

NOW = dt.datetime(2026, 11, 24, 12, tzinfo=wd.UTC)
TARGET = {'repo':'jsdyer/example','branch':'main','workflow':'refresh.yml','crons':['0 * * * *'],
          'freshness':[{'url':'https://coolcode.ca/example/status.json','json_path':['checked_at'],'label':'Source checked','precision':'timestamp'}]}
TOOLS = [{'id':'example','title':'Example','data_info':{'probes':[{'url':'https://coolcode.ca/example/status.json','label':'Records','count_at':{'path':['count'],'unit':'records'}}]}}]

class HTTP:
    def __init__(self, result='success', stamp='2026-11-24T11:35:00Z', count=0):
        self.result,self.stamp,self.count=result,stamp,count
        self.calls=[]
    def request(self, method, path, **kwargs):
        self.calls.append((method,path,kwargs))
        assert method=='GET', 'Reporting must never write or dispatch'
        if kwargs.get('public'):
            return {'checked_at':self.stamp,'count':self.count}
        if '/runs?' in path:
            return {'workflow_runs':[{'id':42,'created_at':'2026-11-24T11:30:00Z','head_branch':'main','status':'completed','conclusion':self.result,'event':'workflow_dispatch'}]}
        return {'state':'active'}

class OutcomeTests(unittest.TestCase):
    def test_failed_collector_and_recent_snapshot_are_both_visible(self):
        row=observe(TARGET,TOOLS,NOW,HTTP(result='failure'))
        self.assertEqual(row['execution']['latest_refresh']['conclusion'],'failure')
        self.assertEqual(row['output']['status'],'recent')
        self.assertEqual(row['status'],'attention')

    def test_successful_pages_push_does_not_erase_failed_collector(self):
        class PushAfterFailure(HTTP):
            def request(self,method,path,**kwargs):
                result=super().request(method,path,**kwargs)
                if '/runs?' in path:
                    result['workflow_runs'][0]['conclusion']='failure'
                    result['workflow_runs'].insert(0,{'id':43,'created_at':'2026-11-24T11:40:00Z','head_branch':'main','status':'completed','conclusion':'success','event':'push'})
                return result
        row=observe(TARGET,TOOLS,NOW,PushAfterFailure())
        self.assertEqual(row['execution']['latest']['conclusion'],'success')
        self.assertEqual(row['execution']['latest_refresh']['conclusion'],'failure')
        self.assertEqual(row['status'],'attention')

    def test_missing_due_run_is_visible_even_if_a_push_has_succeeded(self):
        class PushOnly(HTTP):
            def request(self,method,path,**kwargs):
                result=super().request(method,path,**kwargs)
                if '/runs?' in path:result['workflow_runs'][0]['event']='push'
                return result
        row=observe(TARGET,TOOLS,NOW,PushOnly())
        self.assertTrue(row['execution']['due_unobserved'])
        self.assertEqual(row['status'],'attention')
        check_only={k:v for k,v in TARGET.items() if k!='freshness'}
        row=observe(check_only,TOOLS,NOW,PushOnly())
        self.assertFalse(row['execution']['due_unobserved'])
        self.assertEqual(row['status'],'workflow_only')

    def test_successful_workflow_does_not_hide_overdue_output(self):
        row=observe(TARGET,TOOLS,NOW,HTTP(stamp='2026-11-20T11:35:00Z'))
        self.assertEqual(row['execution']['latest']['conclusion'],'success')
        self.assertEqual(row['output']['status'],'stale')
        self.assertEqual(row['status'],'attention')

    def test_unchanged_and_zero_counts_are_valid_without_fabricated_changes(self):
        http=HTTP(count=0)
        row=observe(TARGET,TOOLS,NOW,http)
        self.assertEqual(row['counts'][0]['value'],0)
        self.assertEqual(row['status'],'checked')
        self.assertEqual(len([c for c in http.calls if c[2].get('public')]),1)
        before=assemble([row],NOW)
        after=assemble([row],NOW+dt.timedelta(hours=1),before)
        self.assertEqual(after['changes'],[])
        self.assertEqual(len(after['history']),2)

    def test_date_only_precision_does_not_claim_individual_run_verification(self):
        target=copy.deepcopy(TARGET);target['freshness'][0]['precision']='date'
        row=observe(target,TOOLS,NOW,HTTP(stamp='2026-11-24'))
        self.assertEqual(row['output']['run_alignment'],'date_only')
        self.assertEqual(row['status'],'checked')

    def test_recent_output_before_successful_run_is_only_limited_evidence(self):
        row=observe(TARGET,TOOLS,NOW,HTTP(stamp='2026-11-24T11:00:00Z'))
        self.assertEqual(row['output']['status'],'recent')
        self.assertEqual(row['output']['run_alignment'],'predates_success')
        self.assertEqual(row['status'],'limited')

    def test_missing_field_and_invalid_count_are_not_a_passing_output(self):
        row=observe(TARGET,TOOLS,NOW,HTTP(stamp='invalid',count='many'))
        self.assertEqual(row['output']['status'],'unavailable')
        self.assertEqual(row['counts'][0]['error'],'count_missing_or_invalid')
        self.assertEqual(row['status'],'attention')

    def test_recovery_and_changed_counts_appear_in_observation_history(self):
        bad=observe(TARGET,TOOLS,NOW,HTTP(result='failure',count=4))
        good=observe(TARGET,TOOLS,NOW,HTTP(count=6))
        report=assemble([good],NOW,assemble([bad],NOW-dt.timedelta(hours=1)))
        change=report['changes'][0]
        self.assertEqual(change['before']['status'],'attention')
        self.assertEqual(change['after']['status'],'checked')
        self.assertEqual(change['after']['counts'][0]['value'],6)

    def test_another_failed_run_is_recorded_even_when_status_and_counts_match(self):
        before=observe(TARGET,TOOLS,NOW,HTTP(result='failure',count=4))
        after=copy.deepcopy(before)
        for key in ('latest','latest_refresh'):
            after['execution'][key].update(id=43,attempt=1)
        report=assemble([after],NOW,assemble([before],NOW-dt.timedelta(hours=1)))
        self.assertEqual(len(report['changes']),1)
        change=report['changes'][0]
        self.assertEqual(change['before']['status'],change['after']['status'])
        self.assertEqual(change['after']['latest_id'],43)
        self.assertEqual(change['after']['latest_result'],'failure')
        retry=copy.deepcopy(after)
        for key in ('latest','latest_refresh'):
            retry['execution'][key]['attempt']=2
        self.assertEqual(len(assemble([retry],NOW,report)['changes']),1)

    def test_reviewed_non_data_workflow_is_explicitly_workflow_only(self):
        target={k:v for k,v in TARGET.items() if k!='freshness'}
        row=observe(target,TOOLS,NOW,HTTP())
        self.assertEqual(row['output']['status'],'not_configured')
        self.assertEqual(row['status'],'workflow_only')

    def test_cached_counts_keep_their_read_time_and_new_runs_force_recheck(self):
        target=copy.deepcopy(TARGET);target['crons']=['0 0 * * *']
        first=observe(target,TOOLS,NOW,HTTP(count=5))
        http=HTTP(count=99)
        second=observe(target,TOOLS,NOW+dt.timedelta(hours=1),http,first)
        self.assertTrue(second['output']['checks'][0]['cached'])
        self.assertEqual(second['counts'][0]['value'],5)
        self.assertEqual(second['counts'][0]['read_at'],wd.stamp(NOW))
        self.assertFalse(any(c[2].get('public') for c in http.calls))
        class NewRun(HTTP):
            def request(self,method,path,**kwargs):
                result=super().request(method,path,**kwargs)
                if '/runs?' in path:result['workflow_runs'][0]['id']=43
                return result
        third=observe(target,TOOLS,NOW+dt.timedelta(hours=1),NewRun(count=7),second)
        self.assertFalse(third['output']['checks'][0]['cached'])
        self.assertEqual(third['counts'][0]['value'],7)

    def test_api_permission_error_does_not_hide_published_evidence(self):
        class Restricted(HTTP):
            def request(self,method,path,**kwargs):
                if not kwargs.get('public'):raise wd.SafeError('permission_denied',403)
                return super().request(method,path,**kwargs)
        row=observe(TARGET,TOOLS,NOW,Restricted())
        self.assertEqual(row['execution']['error'],'permission_denied')
        self.assertEqual(row['output']['status'],'recent')
        self.assertEqual(row['status'],'attention')

class StepEvidence(HTTP):
    def __init__(self, latest_step='skipped', refresh_step='failure', latest_result='success', **kwargs):
        super().__init__(**kwargs)
        self.latest_step,self.refresh_step,self.latest_result=latest_step,refresh_step,latest_result
    def request(self,method,path,**kwargs):
        result=super().request(method,path,**kwargs)
        if '/runs?' in path:
            result['workflow_runs'][0]['conclusion']='failure' if self.refresh_step=='failure' else 'success'
            result['workflow_runs'].insert(0,{'id':43,'created_at':'2026-11-24T11:40:00Z','head_branch':'main','status':'completed','conclusion':self.latest_result,'event':'push'})
        if '/jobs?' in path:
            step=self.latest_step if '/43/' in path else self.refresh_step
            return {'jobs':[{'steps':[{'name':'Download source','conclusion':step}]}]}
        return result

class ReviewedOutcomeTests(unittest.TestCase):
    def target(self):
        target=copy.deepcopy(TARGET);target['collection_steps']=['Download source'];return target
    def test_skipped_build_does_not_clear_failed_collection(self):
        row=observe(self.target(),TOOLS,NOW,StepEvidence())
        self.assertEqual(row['status'],'attention')
        self.assertEqual(row['execution']['latest_collection']['id'],42)
        self.assertIn('collection was skipped',' '.join(row['reasons']))
    def test_verified_collection_on_push_can_recover_and_satisfy_due_time(self):
        row=observe(self.target(),TOOLS,NOW,StepEvidence(latest_step='success',stamp='2026-11-24T11:41:00Z'))
        self.assertEqual(row['status'],'checked')
        self.assertEqual(row['execution']['latest_collection']['id'],43)
        self.assertFalse(row['execution']['due_unobserved'])
    def test_deployment_retry_compares_output_with_the_reused_collection_step(self):
        class DeployRetry(HTTP):
            def request(self,method,path,**kwargs):
                result=super().request(method,path,**kwargs)
                if '/runs?' in path:
                    result['workflow_runs'][0].update(run_started_at='2026-11-24T11:55:00Z',run_attempt=2)
                if '/jobs?' in path:
                    return {'jobs':[{'steps':[{'name':'Download source','conclusion':'success','started_at':'2026-11-24T11:30:00Z'}]}]}
                return result
        row=observe(self.target(),TOOLS,NOW,DeployRetry())
        self.assertEqual(row['execution']['latest']['at'],'2026-11-24T11:55:00Z')
        self.assertEqual(row['execution']['collection_started_at'],'2026-11-24T11:30:00Z')
        self.assertEqual(row['output']['run_alignment'],'at_or_after_start')
        self.assertEqual(row['status'],'checked')
        older=observe(self.target(),TOOLS,NOW,DeployRetry(stamp='2026-11-24T11:00:00Z'))
        self.assertEqual(older['status'],'limited')
        later=observe(self.target(),TOOLS,NOW+dt.timedelta(hours=1),DeployRetry())
        self.assertTrue(later['execution']['due_unobserved'])
    def test_repeated_collection_can_satisfy_due_time_but_deployment_retry_cannot(self):
        class Retry(HTTP):
            def __init__(self,source_start):
                super().__init__(stamp=source_start);self.source_start=source_start
            def request(self,method,path,**kwargs):
                result=super().request(method,path,**kwargs)
                if '/runs?' in path:
                    result['workflow_runs'][0].update(created_at='2026-11-24T10:30:00Z',run_started_at='2026-11-24T11:55:00Z',run_attempt=2)
                if '/jobs?' in path:
                    return {'jobs':[{'steps':[{'name':'Download source','conclusion':'success','started_at':self.source_start}]}]}
                return result
        old=observe(self.target(),TOOLS,NOW,Retry('2026-11-24T10:30:00Z'))
        self.assertTrue(old['execution']['due_unobserved'])
        new=observe(self.target(),TOOLS,NOW,Retry('2026-11-24T11:55:05Z'))
        self.assertFalse(new['execution']['due_unobserved'])
        self.assertEqual(new['status'],'checked')
    def test_continue_on_error_does_not_hide_failed_source_step(self):
        row=observe(self.target(),TOOLS,NOW,StepEvidence(latest_step='failure'))
        self.assertEqual(row['status'],'attention')
        self.assertIn('collection steps failed',' '.join(row['reasons']))
    def test_missing_step_details_are_not_confirmation_of_collection(self):
        row=observe(self.target(),TOOLS,NOW,HTTP())
        self.assertNotEqual(row['status'],'checked')
        self.assertTrue(row['execution']['collection_unconfirmed'])
    def test_failed_collector_push_between_skipped_build_and_old_dispatch_is_not_lost(self):
        class InterveningPush(StepEvidence):
            def request(self,method,path,**kwargs):
                result=super().request(method,path,**kwargs)
                if '/runs?' in path:
                    result['workflow_runs'].insert(1,{'id':44,'created_at':'2026-11-24T11:38:00Z','head_branch':'main','status':'completed','conclusion':'failure','event':'push'})
                if '/44/jobs?' in path:
                    return {'jobs':[{'steps':[{'name':'Download source','conclusion':'failure'}]}]}
                return result
        row=observe(self.target(),TOOLS,NOW,InterveningPush(refresh_step='success'))
        self.assertEqual(row['status'],'attention')
        self.assertEqual(row['execution']['latest_collection']['id'],44)
        self.assertFalse(row['execution']['due_unobserved'])
    def test_skipped_manual_build_does_not_satisfy_collection_schedule(self):
        row=observe(self.target(),TOOLS,NOW,StepEvidence(latest_step='skipped',refresh_step='skipped'))
        self.assertTrue(row['execution']['due_unobserved'])
        self.assertNotEqual(row['status'],'checked')

    def test_permitted_cache_is_explicit_but_cannot_mask_stale_output(self):
        target=copy.deepcopy(TARGET);target['freshness'][0]['cache_max_age_seconds']=7200
        recent=observe(target,TOOLS,NOW,HTTP(stamp='2026-11-24T11:00:00Z'))
        self.assertEqual(recent['output']['run_alignment'],'permitted_cache')
        self.assertEqual(recent['status'],'checked')
        old=observe(target,TOOLS,NOW,HTTP(stamp='2026-11-20T11:00:00Z'))
        self.assertEqual(old['status'],'attention')
    def test_partial_source_failure_is_visible_with_successful_workflow(self):
        class Partial(HTTP):
            def request(self,method,path,**kwargs):
                result=super().request(method,path,**kwargs)
                if kwargs.get('public'):result['sources']={'apod':'no usable dated entries','earth':'ok'}
                return result
        target=copy.deepcopy(TARGET);target['freshness'][0]['source_status_path']=['sources']
        row=observe(target,TOOLS,NOW,Partial())
        self.assertEqual(row['status'],'attention')
        self.assertIn('apod',' '.join(row['reasons']))
        self.assertEqual(row['output']['status'],'recent')
    def test_unconfirmed_output_is_reread_after_independent_publication(self):
        target=copy.deepcopy(TARGET);target['crons']=['0 0 * * *']
        first=observe(target,TOOLS,NOW,HTTP(stamp='2026-11-24T10:00:00Z',count=5))
        self.assertEqual(first['status'],'limited')
        row=observe(target,TOOLS,NOW+dt.timedelta(hours=1),HTTP(stamp='2026-11-24T12:30:00Z',count=6),first)
        self.assertFalse(row['output']['checks'][0]['cached'])
        self.assertEqual(row['status'],'checked')
        self.assertEqual(row['counts'][0]['value'],6)

    def test_explicit_fresh_check_rereads_unchanged_metadata(self):
        target=copy.deepcopy(TARGET);target['crons']=['0 0 * * *']
        first=observe(target,TOOLS,NOW,HTTP(count=5))
        http=HTTP(count=9)
        next_row=observe(target,TOOLS,NOW+dt.timedelta(hours=1),http,first,fresh=True)
        self.assertFalse(next_row['output']['checks'][0]['cached'])
        self.assertEqual(next_row['counts'][0]['value'],9)

if __name__=='__main__':unittest.main()
