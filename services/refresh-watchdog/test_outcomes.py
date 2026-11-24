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

    def test_no_published_probe_is_explicitly_limited(self):
        target={k:v for k,v in TARGET.items() if k!='freshness'}
        row=observe(target,TOOLS,NOW,HTTP())
        self.assertEqual(row['output']['status'],'not_configured')
        self.assertEqual(row['status'],'limited')

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

if __name__=='__main__':unittest.main()
