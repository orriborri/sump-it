"""Provider-independent runner contract, exercised without inference credentials."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("ai_runner", Path(__file__).parents[2] / "scripts/ai_runner.py")
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


def response(content=None, calls=None):
    return {"choices": [{"finish_reason": "tool_calls" if calls else "stop",
                         "message": {"role": "assistant", "content": content, "tool_calls": calls or []}}],
            "usage": {"total_tokens": 11}}


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name).resolve()
        self.request = {"role": "delivery", "workspace": str(self.root), "model": "configured-model",
                        "prompt": "Create a reviewed artifact", "max_steps": 3,
                        "max_output_tokens": 1024, "timeout_seconds": 20}

    def tearDown(self):
        self.directory.cleanup()

    def test_tool_iteration_writes_workspace_and_returns_usage(self):
        call = {"id": "tool-1", "type": "function", "function": {"name": "write_file",
                "arguments": json.dumps({"path": "docs/result.md", "content": "Accepted result"})}}
        replies = [response(calls=[call]), response(json.dumps({"summary": "Artifact written"}))]
        payloads = []

        def transport(endpoint, key, payload, timeout):
            self.assertEqual(endpoint, "https://inference.example.test/custom/completions")
            self.assertEqual(key, "test-key")
            self.assertEqual(payload["model"], "configured-model")
            payloads.append(json.loads(json.dumps(payload)))
            return replies.pop(0)

        result = runner.chat_agent(self.request, "https://inference.example.test/custom/completions", "test-key", transport)
        self.assertEqual((self.root / 'docs/result.md').read_text(), 'Accepted result')
        self.assertEqual(payloads[1]['messages'][-1]['role'], 'tool')
        self.assertEqual(result['usage'], {'requests': 2, 'reported_total_tokens': 22})

    def test_review_does_not_offer_or_execute_mutation_tools(self):
        names = {tool['function']['name'] for tool in runner.tools('review')}
        self.assertEqual(names, {'read_file', 'list_files'})
        for name, arguments in [('write_file', {'path': 'bad.md', 'content': 'bad'}),
                                ('run_command', {'command': 'touch bad.md'})]:
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, 'unavailable'):
                runner.tool_call('review', name, arguments, self.root, 20)
        self.assertFalse((self.root / 'bad.md').exists())

    def test_reference_adapter_stops_at_step_limit(self):
        (self.root / 'file.md').write_text('reference')
        call = {'id': 'tool', 'type': 'function', 'function': {'name': 'read_file',
                'arguments': '{"path":"file.md"}'}}
        with self.assertRaisesRegex(ValueError, 'step limit'):
            runner.chat_agent(self.request, 'https://inference.example.test', '', lambda *args: response(calls=[call]))

    def test_truncated_inference_does_not_return_success(self):
        reply = response('{"summary":"partial"}')
        reply['choices'][0]['finish_reason'] = 'length'
        with self.assertRaisesRegex(ValueError, 'complete response'):
            runner.chat_agent(self.request, 'https://inference.example.test', '', lambda *args: reply)

    def test_invalid_review_results_fail_closed(self):
        values = [{'summary': 'Done'}, {'summary': 'Done', 'verdict': 'pass', 'findings': [{}]},
                  {'summary': 'Done', 'verdict': 'approved', 'findings': []}]
        for value in values:
            with self.subTest(value=value), self.assertRaises(ValueError):
                runner.validate_result(value, 'review')

    def test_paths_cannot_escape_workspace_or_access_git(self):
        for path in ['../secrets', '/etc/passwd', '.git/config']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                runner.workspace_path(self.root, path)

    def test_local_command_does_not_inherit_provider_or_github_credentials(self):
        with patch.dict(os.environ, {'AI_API_KEY': 'private-model-key', 'GH_TOKEN': 'private-git-token'}):
            output = runner.tool_call('delivery', 'run_command', {
                'command': 'env', 'timeout_seconds': 5}, self.root, 10)
        self.assertNotIn('private-model-key', output)
        self.assertNotIn('private-git-token', output)

    def test_timeout_kills_descendants_before_they_can_change_workspace(self):
        with self.assertRaises(subprocess.TimeoutExpired):
            runner.tool_call('delivery', 'run_command', {
                'command': '(sleep 1.5; touch late-write) & wait', 'timeout_seconds': 1}, self.root, 5)
        time.sleep(0.7)
        self.assertFalse((self.root / 'late-write').exists())

    def test_successful_command_cannot_leave_background_writer(self):
        runner.tool_call('delivery', 'run_command', {
            'command': '(sleep 0.3; touch background-write) >/dev/null 2>&1 &',
            'timeout_seconds': 2}, self.root, 5)
        time.sleep(0.5)
        self.assertFalse((self.root / 'background-write').exists())

    def test_command_adapter_receives_versioned_request_and_validates_response(self):
        old = Path.cwd()
        os.chdir(self.root)
        try:
            Path('prompt.md').write_text('Review this diff')
            Path('adapter.py').write_text('''import argparse,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--request');p.add_argument('--response');a=p.parse_args()
request=json.loads(Path(a.request).read_text())
assert request['version']==1 and request['read_only'] and request['role']=='review'
assert 'AI_API_KEY' not in request
Path(a.response).write_text(json.dumps({'summary':'Independent review complete','verdict':'pass','findings':[]}))
import subprocess,sys
subprocess.Popen([sys.executable,'-c','import time;from pathlib import Path;time.sleep(0.3);Path("adapter-background").touch()'])
''')
            env = {'AI_ADAPTER': 'command', 'AI_RUNNER_COMMAND': json.dumps([sys.executable, str(self.root / 'adapter.py')]),
                   'AI_MODEL': 'another-engine', 'AI_API_KEY': 'not-in-request'}
            with patch.dict(os.environ, env):
                result = runner.execute('review', 'prompt.md')
            self.assertEqual(result['verdict'], 'pass')
            self.assertNotIn('not-in-request', Path('.ai-run/runner-request.json').read_text())
            time.sleep(0.5)
            self.assertFalse(Path('adapter-background').exists())
        finally:
            os.chdir(old)

    def test_missing_endpoint_or_model_has_no_vendor_fallback(self):
        with self.assertRaisesRegex(ValueError, 'Configure'):
            runner.chat_agent(self.request, '', '')
        self.request['model'] = ''
        with self.assertRaises(ValueError):
            runner.chat_agent(self.request, 'https://inference.example.test', '')

    def test_insecure_remote_endpoint_is_rejected_before_network(self):
        with self.assertRaisesRegex(ValueError, 'HTTPS'):
            runner.completion('http://remote.example.test/completions', 'key', {}, 1)


if __name__ == '__main__':
    unittest.main()
