"""Behavioral regressions at the controller's policy/publication boundary."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("ai_sdlc", Path(__file__).parents[2] / "scripts/ai_sdlc.py")
sdlc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sdlc)


class PolicyTests(unittest.TestCase):
    def test_build_accepts_source_new_tests_and_own_evidence(self):
        sdlc.check_paths("build", 42, [("M", "backend/src/recipe.rs"),
            ("A", "backend/tests/recipe_db.rs"), ("A", "frontend/app/brew/new.test.tsx"),
            ("M", "docs/changes/42/plan.md"), ("A", "docs/changes/42/evidence.md")])

    def test_design_and_plan_cannot_implement(self):
        for stage in ("design", "plan"):
            with self.subTest(stage=stage), self.assertRaises(ValueError):
                sdlc.check_paths(stage, 42, [("M", "backend/src/recipe.rs")])

    def test_agent_cannot_change_gates_or_other_issues(self):
        for path in (".github/workflows/contract.yml", "scripts/ai_sdlc.py", "Makefile",
                     "frontend/package.json", "backend/Cargo.lock", "backend/.cargo/config.toml",
                     "backend/migrations/0004.sql", "docs/changes/43/plan.md",
                     "frontend/vitest.config.ts", "frontend/app/evil.sh"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                sdlc.check_paths("build", 42, [("M", path)])

    def test_fix_preserves_existing_tests_but_can_add_regressions(self):
        for path in ("backend/tests/bean_inventory_db.rs", "frontend/app/brew/page.test.tsx"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                sdlc.check_paths("fix", 42, [("M", path)])
        sdlc.check_paths("fix", 42, [("A", "backend/tests/regression.rs")])

    def test_deletions_renames_type_changes_and_traversal_fail(self):
        for status, path in (("D", "backend/src/recipe.rs"), ("R100", "backend/src/recipe.rs"),
                             ("T", "backend/src/recipe.rs"), ("A", "/backend/src/a.rs"),
                             ("A", "docs/changes/42/../../43/intent.md")):
            with self.subTest(path=path, status=status), self.assertRaises(ValueError):
                sdlc.check_paths("build", 42, [(status, path)])

    def test_learn_can_propose_policy_but_not_code(self):
        sdlc.check_paths("learn", 42, [("M", "CLAUDE.md"), ("M", "REVIEW.md")])
        with self.assertRaises(ValueError):
            sdlc.check_paths("learn", 42, [("M", "backend/src/recipe.rs")])

    def test_unaccepted_or_empty_artifacts_block_build(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for filename in ("intent.md", "spec.md"):
                (root / filename).write_text("Reviewed document")
            with self.assertRaisesRegex(ValueError, "plan.md"):
                sdlc.prerequisites("build", root)
            (root / "plan.md").write_text(" ")
            with self.assertRaises(ValueError):
                sdlc.prerequisites("build", root)
            (root / "plan.md").write_text("Reviewed implementation plan")
            sdlc.prerequisites("build", root)

    def test_issue_numbers_are_not_shell_or_api_input(self):
        for value in ("0", "-1", "1;echo bad", "1/../../", "1\n2", "1.0"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                sdlc.number(value)

    def test_inline_rust_test_suffix_is_preserved(self):
        tests = '\n#[cfg(test)]\nmod tests { #[test] fn check() { assert_eq!(answer(), 42); } }\n'
        original = 'fn answer() -> i32 { 0 }\n' + tests
        sdlc.protect_inline_tests(original, 'fn answer() -> i32 { 42 }\n' + tests)
        with self.assertRaisesRegex(ValueError, 'inline Rust tests'):
            sdlc.protect_inline_tests(original, original.replace('assert_eq!(answer(), 42)', 'assert!(true)'))
        with self.assertRaises(ValueError):
            sdlc.protect_inline_tests(original, 'fn answer() -> i32 { 42 }\n')


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.old = Path.cwd()
        os.chdir(self.directory.name)
        Path(".ai-run").mkdir()
        self.task = {"stage": "fix", "issue": 42, "pr": 19, "parent": "a" * 40,
                     "branch": "ai/build-42-123", "base": "main", "repo": "orriborri/sump-it"}
        self.env = {"GITHUB_REPOSITORY": "orriborri/sump-it", "EXPECTED_STAGE": "fix",
                    "GITHUB_RUN_ID": "123",
                    "EXPECTED_ISSUE": "42", "EXPECTED_PR": "19", "EXPECTED_PARENT": "a" * 40,
                    "EXPECTED_BRANCH": "ai/build-42-123"}

    def tearDown(self):
        os.chdir(self.old)
        self.directory.cleanup()

    def test_tampered_artifact_cannot_select_another_parent(self):
        self.task["parent"] = "b" * 40
        Path(".ai-run/task.json").write_text(json.dumps(self.task))
        with patch.dict(os.environ, self.env), patch.object(sdlc, "run") as command:
            with self.assertRaisesRegex(ValueError, "metadata mismatch"):
                sdlc.publish()
            command.assert_not_called()

    def test_concurrent_branch_update_blocks_publication_before_git(self):
        Path(".ai-run/task.json").write_text(json.dumps(self.task))
        responses = [{"default_branch": "main"},
                     {"state": "open", "head": {"ref": self.task["branch"], "sha": "b" * 40}}]
        with patch.dict(os.environ, self.env), patch.object(sdlc, "gh", side_effect=responses), patch.object(sdlc, "run") as command:
            with self.assertRaisesRegex(ValueError, "changed while"):
                sdlc.publish()
            command.assert_not_called()

    def test_stale_review_never_posts(self):
        env = {**self.env, "REVIEW_HEAD": "a" * 40,
               "REVIEW_RESULT": json.dumps({"verdict": "pass", "summary": "OK", "findings": []})}
        with patch.dict(os.environ, env), patch.object(sdlc, "gh", return_value={"head": {"sha": "b" * 40}}), patch.object(sdlc, "run") as command:
            with self.assertRaisesRegex(ValueError, "Stale review"):
                sdlc.post_review("19")
            command.assert_not_called()

    def test_rerun_marks_candidate_pending_before_model_execution(self):
        output = Path('job-output')
        env = {**self.env, 'GITHUB_OUTPUT': str(output)}
        pull = {'state': 'open', 'head': {'sha': 'a' * 40, 'repo': {'full_name': 'orriborri/sump-it'}}}
        with patch.dict(os.environ, env), patch.object(sdlc, 'gh', return_value=pull), patch.object(sdlc, 'run') as command:
            sdlc.review_start('19')
            self.assertIn('state=pending', command.call_args.args)
            self.assertEqual(output.read_text(), 'head=' + 'a' * 40 + '\n')

    def test_findings_post_evidence_but_fail_check(self):
        env = {**self.env, "REVIEW_HEAD": "a" * 40,
               "REVIEW_RESULT": json.dumps({"verdict": "findings", "summary": "Inventory race",
                   "findings": [{"severity": "important", "pass": "bugs", "path": "backend/src/services/beans.rs", "detail": "Update loses concurrent quantity changes"}]})}
        with patch.dict(os.environ, env), patch.object(sdlc, "gh", return_value={"head": {"sha": "a" * 40}}), patch.object(sdlc, "run") as command:
            with self.assertRaisesRegex(ValueError, "findings or blockers"):
                sdlc.post_review("19")
            self.assertEqual(command.call_args_list[0].args[:3], ("gh", "pr", "comment"))
            self.assertIn("repos/orriborri/sump-it/statuses/" + "a" * 40, command.call_args.args)
            self.assertIn("state=failure", command.call_args.args)
            self.assertIn("Inventory race", Path(".ai-run/review.md").read_text())

    def test_fresh_posting_runner_creates_directory_and_head_status(self):
        Path('.ai-run').rmdir()
        env = {**self.env, "REVIEW_HEAD": "a" * 40,
               "REVIEW_RESULT": json.dumps({"verdict": "pass", "summary": "No defects", "findings": []})}
        with patch.dict(os.environ, env), patch.object(sdlc, "gh", return_value={"head": {"sha": "a" * 40}}), patch.object(sdlc, "run") as command:
            sdlc.post_review('19')
            self.assertTrue(Path('.ai-run/review.md').is_file())
            self.assertIn('state=success', command.call_args.args)


if __name__ == "__main__":
    unittest.main()
