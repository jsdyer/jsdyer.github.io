"""Healthchecks measures watchdog execution, while collector failures stay reported."""
import contextlib
import datetime as dt
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import watchdog as w
from test_watchdog import Fake, completed as sample_run, config

NOW=dt.datetime.now(w.UTC)
OLD=w.stamp(NOW-dt.timedelta(days=30))


def completed(**kwargs):
    kwargs.setdefault('created',w.stamp(NOW-dt.timedelta(minutes=1)))
    return sample_run(**kwargs)


class HeartbeatScope(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root=Path(self.directory.name)
        self.report_path=self.root/'report.json'
        self.url='https://monitor.example/private-check'
        self.pings=[]
        self.probe={'url':'https://tool.example/status.json','json_path':'checked','max_age_seconds':3600}

    def execute(self, fake, configuration=None, state=None, delivered=True):
        path=self.root/'targets.json'
        path.write_text(json.dumps(configuration or config(freshness=[self.probe])))
        if state is not None:(self.root/'state.json').write_text(json.dumps(state))
        def ping(url, healthy):
            # Successful execution signals must follow a saved complete report.
            if healthy:
                report=json.loads(self.report_path.read_text())
                self.assertEqual(report['watchdog_errors'],0)
                self.assertEqual(report['heartbeat_scope'],'watchdog_execution')
            self.pings.append((url,healthy))
            return delivered
        with patch.dict(os.environ,{'GH_TOKEN':'test-only'}), \
                patch.object(w,'HTTP',return_value=fake), \
                patch.object(w,'heartbeat_url',return_value=self.url), \
                patch.object(w,'ping_heartbeat',side_effect=ping), \
                contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
            code=w.main(['--config',str(path),'--state',str(self.root/'state.json'),
                         '--report',str(self.report_path),'--apply','--heartbeat-url-file','unused'])
        report=json.loads(self.report_path.read_text()) if self.report_path.exists() else None
        return code,report

    def test_failed_collector_and_expired_data_keep_green_through_retry_and_cooldown(self):
        failed=dict(completed(),conclusion='failure')
        public={'checked':OLD}
        for expected in ('dispatch_requested','cooldown'):
            fake=Fake(runs=[failed],public=public)
            code,report=self.execute(fake)
            self.assertEqual(code,0)
            self.assertEqual(self.pings[-1],(self.url,True))
            self.assertEqual(report['watchdog_health'],'healthy')
            self.assertEqual(report['watchdog_errors'],0)
            self.assertEqual(report['collector_errors'],1)
            self.assertEqual(report['health'],'unhealthy')
            self.assertEqual(report['errors'],1)
            row=report['targets'][0]
            self.assertEqual(row['status'],expected)
            self.assertEqual(row['error_scope'],'collector')
            self.assertEqual(row['freshness'][0]['status'],'stale')
            self.assertIn('retry_after',row)
            self.assertFalse(row['verified_refresh'])

    def test_successful_workflow_with_stale_or_invalid_metadata_stays_visible_without_failure_ping(self):
        for public in ({'checked':OLD}, {}, {'checked':w.stamp(NOW+dt.timedelta(days=1))}):
            with self.subTest(public=public):
                fake=Fake(runs=[completed()],public=public)
                code,report=self.execute(fake,state={})
                self.assertEqual(code,0)
                self.assertEqual(self.pings[-1],(self.url,True))
                self.assertEqual(report['targets'][0]['status'],'published_stale')
                self.assertEqual(report['collector_errors'],1)
                self.assertFalse(fake.writes)
                self.assertFalse(report['targets'][0]['verified_refresh'])

    def test_public_status_403_is_not_a_watchdog_authentication_failure(self):
        class PublicDenied(Fake):
            def request(self,method,path,payload=None,public=False):
                if public:raise w.SafeError('permission_denied',403)
                return super().request(method,path,payload,public)
        code,report=self.execute(PublicDenied(runs=[completed()]))
        self.assertEqual(code,0)
        self.assertEqual(self.pings,[(self.url,True)])
        self.assertEqual(report['watchdog_errors'],0)
        self.assertEqual(report['collector_errors'],1)
        self.assertEqual(report['targets'][0]['freshness'][0]['error'],'permission_denied')

    def test_stalled_collector_does_not_fail_execution_heartbeat_or_create_duplicate(self):
        fake=Fake(runs=[dict(completed(created=w.stamp(NOW-dt.timedelta(days=3))),status='in_progress',conclusion=None)],
                  public={'checked':OLD})
        code,report=self.execute(fake)
        self.assertEqual(code,0)
        self.assertEqual(self.pings,[(self.url,True)])
        self.assertEqual(report['targets'][0]['status'],'stalled_run')
        self.assertEqual(report['collector_errors'],1)
        self.assertFalse(fake.writes)

    def test_cannot_read_github_workflows_is_an_execution_failure(self):
        for error in (w.SafeError('authentication_failed',401),w.SafeError('permission_denied',403),w.SafeError('network_error')):
            with self.subTest(error=error.kind):
                code,report=self.execute(Fake(fail=error),state={})
                self.assertEqual(code,1)
                self.assertEqual(self.pings[-1],(self.url,False))
                self.assertEqual(report['watchdog_health'],'unhealthy')
                self.assertEqual(report['watchdog_errors'],1)
                self.assertEqual(report['collector_errors'],0)
                self.assertEqual(report['targets'][0]['error_scope'],'watchdog')

    def test_unable_to_request_recovery_is_an_execution_failure(self):
        class DispatchDenied(Fake):
            def request(self,method,path,payload=None,public=False):
                if method=='POST':raise w.SafeError('permission_denied',403)
                return super().request(method,path,payload,public)
        code,report=self.execute(DispatchDenied(public={'checked':w.stamp(NOW)}))
        self.assertEqual(code,1)
        self.assertEqual(self.pings,[(self.url,False)])
        self.assertEqual(report['watchdog_errors'],1)
        self.assertEqual(report['dispatch_attempts'],1)
        self.assertEqual(report['dispatches'],0)

    def test_api_backoff_with_unchecked_targets_is_not_a_completed_pass(self):
        state={'blocked_until':w.stamp(NOW+dt.timedelta(minutes=10))}
        fake=Fake()
        code,report=self.execute(fake,state=state)
        self.assertEqual(code,1)
        self.assertEqual(self.pings,[(self.url,False)])
        self.assertEqual(report['targets'][0]['status'],'not_checked')
        self.assertEqual(report['watchdog_errors'],1)
        self.assertFalse(fake.calls)

    def test_collector_findings_do_not_mask_a_separate_execution_failure(self):
        configuration=config(freshness=[self.probe])
        configuration['targets'].append(dict(configuration['targets'][0],repo='owner/second'))
        class PartialFailure(Fake):
            def request(self,method,path,payload=None,public=False):
                if '/owner/second/' in path:raise w.SafeError('authentication_failed',401)
                return super().request(method,path,payload,public)
        code,report=self.execute(PartialFailure(runs=[completed()],public={'checked':OLD}),configuration)
        self.assertEqual(code,1)
        self.assertEqual(self.pings,[(self.url,False)])
        self.assertEqual(report['watchdog_errors'],1)
        self.assertEqual(report['collector_errors'],1)
        self.assertEqual(report['errors'],2)

    def test_cached_registry_warning_does_not_fail_a_completed_pass(self):
        configuration=config()
        configuration['_registry_warning']='Registry fetch unavailable; valid cached targets retained'
        code,report=self.execute(Fake(runs=[completed()]),configuration)
        self.assertEqual(code,0)
        self.assertEqual(self.pings,[(self.url,True)])
        self.assertEqual(report['watchdog_errors'],0)
        self.assertEqual(report['registry_warning'],configuration['_registry_warning'])

    def test_report_or_state_write_failure_never_sends_success(self):
        original=w.atomic_json
        for filename in ('report.json','state.json'):
            with self.subTest(filename=filename):
                self.pings.clear()
                def fail_write(path,value):
                    if Path(path).name==filename:raise OSError('No space left on device')
                    return original(path,value)
                with patch.object(w,'atomic_json',side_effect=fail_write):
                    code,_=self.execute(Fake(runs=[completed()]),config(),state={})
                self.assertEqual(code,2)
                self.assertEqual(self.pings,[(self.url,False)])

    def test_failed_heartbeat_delivery_is_recorded_as_execution_error(self):
        code,report=self.execute(Fake(runs=[completed()]),config(),delivered=False)
        self.assertEqual(code,1)
        self.assertEqual(report['heartbeat'],'delivery_failed')
        self.assertEqual(report['watchdog_health'],'unhealthy')
        self.assertEqual(report['watchdog_errors'],1)
        self.assertEqual(report['collector_errors'],0)

    def test_fatal_invalid_state_sends_failure(self):
        code,report=self.execute(Fake(),state=[])
        self.assertEqual(code,2)
        self.assertEqual(self.pings,[(self.url,False)])
        self.assertEqual(report['status'],'invalid_state_file')
        self.assertEqual(report['watchdog_health'],'unhealthy')

    def test_collector_error_scope_is_in_progress_log(self):
        events=[]
        w.run(config(freshness=[self.probe]),{},Fake(public={'checked':OLD}),NOW,True,
              progress=lambda event,**fields:events.append({'event':event,**fields}))
        row=events[-1]
        self.assertEqual(row['event'],'target_finished')
        self.assertEqual(row['severity'],'error')
        self.assertEqual(row['error_scope'],'collector')


if __name__=='__main__':unittest.main()
