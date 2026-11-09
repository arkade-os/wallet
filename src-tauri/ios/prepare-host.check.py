import importlib.util
from pathlib import Path
import plistlib
import tempfile
import unittest
import sys

sys.dont_write_bytecode = True

SOURCE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("prepare_host", SOURCE / "prepare-host.py")
host = importlib.util.module_from_spec(spec)
spec.loader.exec_module(host)


class IosHostTests(unittest.TestCase):
    def fixture(self, root):
        app = root / "arkade_iOS"
        app.mkdir()
        project = root / "arkade.xcodeproj"
        project.mkdir()
        (project / "project.pbxproj").write_text(
            'CODE_SIGN_ENTITLEMENTS = "arkade_iOS/arkade_iOS.entitlements";\n'
            'IPHONEOS_DEPLOYMENT_TARGET = 14.0;\n', encoding="utf-8"
        )
        with (app / "Info.plist").open("wb") as output:
            plistlib.dump({"ExistingWork": "retained", "NSCameraUsageDescription": "Custom camera text"}, output)
        with (app / "arkade_iOS.entitlements").open("wb") as output:
            plistlib.dump({"ExistingCapability": True, "com.apple.security.application-groups": ["group.io.arkade.tests"]}, output)
        return app, project

    def test_additive_preparation_is_idempotent_and_retains_xcode_work(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            app, project = self.fixture(root)
            project_before = (project / "project.pbxproj").read_bytes()
            host.prepare(root)
            host.prepare(root, check=True)
            info = host.read_plist(app / "Info.plist")
            self.assertEqual(info["ExistingWork"], "retained")
            self.assertEqual(info["NSCameraUsageDescription"], "Custom camera text")
            self.assertEqual(info["CFBundleURLTypes"][0]["CFBundleURLSchemes"], ["bitcoin", "lightning", "arkade", "web+arkade"])
            entitlements = host.read_plist(app / "arkade_iOS.entitlements")
            self.assertTrue(entitlements["ExistingCapability"])
            self.assertEqual(entitlements["com.apple.security.application-groups"], ["group.io.arkade.tests"])
            self.assertEqual((project / "project.pbxproj").read_bytes(), project_before)
            bytes_before = (app / "Info.plist").read_bytes()
            host.prepare(root)
            self.assertEqual((app / "Info.plist").read_bytes(), bytes_before)

    def test_conflicting_backup_policy_fails_before_any_write(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            app, _ = self.fixture(root)
            path = app / "Info.plist"
            info = host.read_plist(path)
            info["UIFileSharingEnabled"] = True
            with path.open("wb") as output:
                plistlib.dump(info, output)
            before = {file: file.read_bytes() for file in app.iterdir()}
            with self.assertRaisesRegex(ValueError, "must remain false"):
                host.prepare(root)
            self.assertEqual(before, {file: file.read_bytes() for file in app.iterdir()})

    def test_changed_entitlement_path_and_old_deployment_are_preserved(self):
        for setting in ["CODE_SIGN_ENTITLEMENTS = other.entitlements;\nIPHONEOS_DEPLOYMENT_TARGET = 14.0;",
                        "CODE_SIGN_ENTITLEMENTS = arkade_iOS/arkade_iOS.entitlements;\nIPHONEOS_DEPLOYMENT_TARGET = 13.0;"]:
            with self.subTest(setting=setting), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                app, project = self.fixture(root)
                pbx = project / "project.pbxproj"
                pbx.write_text(setting, encoding="utf-8")
                before = {file: file.read_bytes() for file in app.iterdir()}
                with self.assertRaises(ValueError):
                    host.prepare(root)
                self.assertEqual(pbx.read_text(encoding="utf-8"), setting)
                self.assertEqual(before, {file: file.read_bytes() for file in app.iterdir()})

    def test_check_reports_missing_metadata_without_writing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            app, _ = self.fixture(root)
            before = {file: file.read_bytes() for file in app.iterdir()}
            with self.assertRaisesRegex(ValueError, "needs preparation"):
                host.prepare(root, check=True)
            self.assertEqual(before, {file: file.read_bytes() for file in app.iterdir()})

    def test_missing_generated_entitlements_are_created(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            app, _ = self.fixture(root)
            host.prepare(root)
            (app / "arkade_iOS.entitlements").unlink()
            info_before = (app / "Info.plist").read_bytes()
            with self.assertRaisesRegex(ValueError, "needs preparation"):
                host.prepare(root, check=True)
            self.assertFalse((app / "arkade_iOS.entitlements").exists())
            self.assertEqual((app / "Info.plist").read_bytes(), info_before)
            host.prepare(root)
            self.assertEqual(host.read_plist(app / "arkade_iOS.entitlements"), {})
            host.prepare(root, check=True)

    def test_malformed_existing_arrays_are_refused(self):
        required_info = host.read_plist(SOURCE / "Info.plist")
        for value in ("invalid", [12]):
            with self.subTest(value=value), self.assertRaises(ValueError):
                host.merge_info({"CFBundleURLTypes": value}, required_info)
            entry = {"CFBundleURLName": required_info["CFBundleURLTypes"][0]["CFBundleURLName"],
                     "CFBundleURLSchemes": value}
            with self.subTest(schemes=value), self.assertRaises(ValueError):
                host.merge_info({"CFBundleURLTypes": [entry]}, required_info)


if __name__ == "__main__":
    unittest.main()
