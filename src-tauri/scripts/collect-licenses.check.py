import importlib.util
from pathlib import Path
import tempfile
import unittest


spec = importlib.util.spec_from_file_location("collect_licenses", Path(__file__).with_name("collect-licenses.py"))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class PythonLicenseTests(unittest.TestCase):
    def test_windows_keeps_the_installation_license_first(self):
        with tempfile.TemporaryDirectory() as temporary:
            prefix = Path(temporary)
            windows_license = prefix / "LICENSE.txt"
            windows_license.write_text("Python Software Foundation", encoding="utf-8")
            (prefix / "LICENSE").write_text("fallback", encoding="utf-8")
            candidates = collector.python_license_candidates(prefix, prefix / "Lib", "win32", "3.13")
            self.assertEqual(collector.find_python_license(candidates), windows_license)
            self.assertTrue(all(candidate.is_relative_to(prefix) for candidate in candidates))

    def test_unix_uses_standard_library_and_framework_licenses(self):
        with tempfile.TemporaryDirectory() as temporary:
            prefix = Path(temporary)
            license = prefix / "lib" / "LICENSE.txt"
            license.parent.mkdir()
            license.write_text("Python Software Foundation", encoding="utf-8")
            candidates = collector.python_license_candidates(prefix, license.parent, "darwin", "3.13")
            self.assertEqual(collector.find_python_license(candidates), license)
            framework = prefix / "Resources" / "English.lproj" / "License.rtf"
            framework.parent.mkdir(parents=True)
            framework.write_text("{\\rtf1 Python license}", encoding="utf-8")
            license.unlink()
            self.assertEqual(collector.find_python_license(candidates), framework)

    def test_linux_uses_only_bounded_package_documentation_paths(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            license = root / "docs" / "libpython3.13-stdlib" / "copyright"
            license.parent.mkdir(parents=True)
            license.write_text("Python Software Foundation", encoding="utf-8")
            candidates = collector.python_license_candidates(root / "prefix", root / "stdlib", "linux", "3.13", root / "docs")
            self.assertEqual(collector.find_python_license(candidates), license)
            self.assertEqual(len(candidates), 8)

    def test_missing_python_license_fails_instead_of_shipping_without_it(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            candidates = collector.python_license_candidates(root, root / "lib", "linux", "3.13", root / "docs")
            with self.assertRaisesRegex(RuntimeError, "Python license was not found"):
                collector.find_python_license(candidates)


if __name__ == "__main__":
    unittest.main()
