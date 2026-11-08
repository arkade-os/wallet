import hashlib
import importlib.util
import json
from pathlib import Path
import plistlib
import struct
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import zipfile


spec = importlib.util.spec_from_file_location("native_artifacts", Path(__file__).with_name("native-artifacts.py"))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class NativeArtifactsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "repo"
        self.root.mkdir()
        self.output = Path(self.temporary.name) / "artifacts"
        self.git = patch.object(collector.subprocess, "check_output", return_value="fixture-commit\n").start()
        self.addCleanup(patch.stopall)

    def file(self, path, content=b"fixture binary"):
        file = self.root / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(content)
        return file

    def bundle(self, path, macos=False):
        contents = path + "/Contents" if macos else path
        self.file(contents + "/Info.plist", plistlib.dumps({"CFBundleExecutable": "Arkade"}))
        self.file(contents + ("/MacOS" if macos else "") + "/Arkade")

    def archive(self, path, entries):
        file = self.file(path)
        with zipfile.ZipFile(file, "w") as archive:
            for name, data in entries.items():
                archive.writestr(name, data)
        return file

    def test_windows_requires_both_installers_and_rejects_ambiguous_or_empty_output(self):
        nsis = self.file("src-tauri/target/release/bundle/nsis/Arkade.exe")
        with self.assertRaisesRegex(ValueError, "msi"):
            collector.collect("windows", self.root, self.output)
        self.assertFalse(self.output.exists())
        msi = self.file("src-tauri/target/release/bundle/msi/Arkade.msi", b"")
        with self.assertRaisesRegex(ValueError, "empty"):
            collector.collect("windows", self.root, self.output)
        msi.write_bytes(b"fixture installer")
        extra = self.file("src-tauri/target/release/bundle/nsis/stale.exe")
        with self.assertRaisesRegex(ValueError, "found 2"):
            collector.collect("windows", self.root, self.output)
        extra.unlink()
        collector.collect("windows", self.root, self.output)
        self.assertEqual((self.output / nsis.name).read_bytes(), nsis.read_bytes())
        self.assertEqual((self.output / msi.name).read_bytes(), msi.read_bytes())

    def test_linux_does_not_accept_deb_without_appimage_and_archives_the_image(self):
        self.file("src-tauri/target/release/bundle/deb/Arkade.deb")
        with self.assertRaisesRegex(ValueError, "AppImage"):
            collector.collect("linux", self.root, self.output)
        image = self.file("src-tauri/target/release/bundle/appimage/Arkade.AppImage")
        collector.collect("linux", self.root, self.output)
        with tarfile.open(self.output / "Arkade.AppImage.tar.gz") as archive:
            self.assertEqual(archive.extractfile("Arkade.AppImage").read(), image.read_bytes())

    def test_macos_requires_dmg_and_an_executable_app_then_archives_the_bundle(self):
        path = "src-tauri/target/release/bundle/macos/Arkade.app"
        self.bundle(path, macos=True)
        with self.assertRaisesRegex(ValueError, "dmg"):
            collector.collect("macos", self.root, self.output)
        self.file("src-tauri/target/release/bundle/dmg/Arkade.dmg")
        binary = self.root / path / "Contents/MacOS/Arkade"
        binary.write_bytes(b"")
        with self.assertRaisesRegex(ValueError, "executable"):
            collector.collect("macos", self.root, self.output)
        binary.write_bytes(b"fixture executable")
        collector.collect("macos", self.root, self.output)
        with tarfile.open(self.output / "Arkade.app.tar.gz") as archive:
            self.assertEqual(archive.extractfile("Arkade.app/Contents/MacOS/Arkade").read(), b"fixture executable")

    def test_android_requires_all_four_native_abis(self):
        path = "src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk"
        entries = {f"lib/{abi}/libarkade_native_lib.so": b"fixture library" for abi in collector.ANDROID_ABIS}
        incomplete = dict(entries)
        incomplete.pop("lib/x86/libarkade_native_lib.so")
        self.archive(path, incomplete)
        with self.assertRaisesRegex(ValueError, "x86"):
            collector.collect("android", self.root, self.output)
        self.archive(path, entries)
        collector.collect("android", self.root, self.output)
        self.assertTrue((self.output / "Arkade-android-universal-debug.apk").is_file())

    def test_ios_simulator_rejects_ambiguous_architectures(self):
        self.bundle("src-tauri/gen/apple/build/arm64-sim/Arkade.app")
        other = "src-tauri/gen/apple/build/x86_64/Arkade.app"
        self.bundle(other)
        with self.assertRaisesRegex(ValueError, "one simulator"):
            collector.collect("ios-simulator", self.root, self.output)

    def test_android_abi_package_selection(self):
        elf = bytearray(64)
        elf[:7] = b"\x7fELF\x02\x01\x01"
        elf[16:18] = (3).to_bytes(2, 'little')
        elf[18:20] = (183).to_bytes(2, 'little')
        path = 'src-tauri/gen/android/app/build/outputs/apk/arm64/release/app-arm64-release-unsigned.apk'
        self.archive(path, {'classes.dex': b'dex', 'lib/arm64-v8a/libarkade_native_lib.so': elf})
        self.archive(path.replace('app-arm64-release', 'other-arm64-release'), {})
        collector.collect_android_abi('arm64', self.root, self.output)
        with zipfile.ZipFile(self.output / 'Arkade-android-arm64-release-unsigned.apk') as archive:
            self.assertEqual(archive.namelist(), ['classes.dex', 'lib/arm64-v8a/libarkade_native_lib.so'])
        self.assertEqual(json.loads((self.output / 'SOURCE.json').read_text())['abi'], 'arm64-v8a')
        elf[18:20] = (62).to_bytes(2, 'little')
        with self.assertRaisesRegex(ValueError, 'ABI'):
            collector.verify_abi(elf, 183)

    def test_android_abi_preserves_apk_bytes_and_rejects_mixed_abis(self):
        path = 'src-tauri/gen/android/app/build/outputs/apk/arm64/release/app-arm64-release-unsigned.apk'
        elf = bytearray(64)
        elf[:7] = b"\x7fELF\x02\x01\x01"
        elf[16:18] = (3).to_bytes(2, 'little')
        elf[18:20] = (183).to_bytes(2, 'little')
        source = self.archive(path, {'classes.dex': b'dex', 'lib/arm64-v8a/libarkade_native_lib.so': elf})
        collector.collect_android_abi('arm64', self.root, self.output)
        self.assertEqual((self.output / 'Arkade-android-arm64-release-unsigned.apk').read_bytes(), source.read_bytes())
        self.output = self.output.with_name('mixed-artifacts')
        self.archive(path, {'lib/arm64-v8a/libarkade_native_lib.so': elf, 'lib/x86/libarkade_native_lib.so': elf})
        with self.assertRaisesRegex(ValueError, 'unexpected native library architecture'):
            collector.collect_android_abi('arm64', self.root, self.output)

    def test_android_abi_rejects_ambiguous_packages_and_malformed_elf_tables(self):
        path = 'src-tauri/gen/android/app/build/outputs/apk/arm64/release/app-arm64-release-unsigned.apk'
        with self.assertRaisesRegex(ValueError, 'Expected one release APK'):
            collector.collect_android_abi('arm64', self.root, self.output)
        for binary, message in [
            (b'\x7fELF', 'little-endian'),
            (b'\x7fELF\x03\x01\x01' + bytes(64), 'little-endian'),
        ]:
            with self.assertRaisesRegex(ValueError, message):
                collector.verify_abi(binary, 183)
        binary = bytearray(64)
        binary[:7] = b'\x7fELF\x02\x01\x01'
        binary[16:18] = (3).to_bytes(2, 'little')
        binary[18:20] = (183).to_bytes(2, 'little')
        binary[44:46] = (1).to_bytes(2, 'little')
        with self.assertRaisesRegex(ValueError, 'section'):
            collector.verify_abi(binary, 183)
        binary[44:46] = (64).to_bytes(2, 'little')
        binary[48:50] = (1).to_bytes(2, 'little')
        with self.assertRaisesRegex(ValueError, 'section'):
            collector.verify_abi(binary, 183)

    def test_ios_simulator_packages_the_actual_application(self):
        self.bundle("src-tauri/gen/apple/build/arm64-sim/Arkade.app")
        collector.collect("ios-simulator", self.root, self.output)
        with tarfile.open(self.output / "Arkade-ios-simulator.app.tar.gz") as archive:
            self.assertEqual(archive.extractfile("Arkade.app/Arkade").read(), b"fixture binary")

    def test_unsigned_ipa_requires_one_application_and_its_declared_executable(self):
        path = "src-tauri/gen/apple/build/arm64/Arkade.ipa"
        entries = {"Payload/Arkade.app/Info.plist": plistlib.dumps({"CFBundleExecutable": "Arkade"})}
        self.archive(path, entries)
        with self.assertRaisesRegex(ValueError, "executable"):
            collector.collect("ios-device", self.root, self.output)
        entries["Payload/Arkade.app/Arkade"] = b"fixture device executable"
        self.archive(path, entries)
        collector.collect("ios-device", self.root, self.output)
        self.assertTrue((self.output / "Arkade-ios-device-unsigned.ipa").is_file())

    def test_manifests_cover_only_packages_and_source_metadata(self):
        self.file("src-tauri/target/release/bundle/nsis/Arkade.exe")
        self.file("src-tauri/target/release/bundle/msi/Arkade.msi")
        self.file("debug.keystore", b"never collect")
        with patch.dict(collector.os.environ, {"GITHUB_RUN_ID": "42", "GITHUB_REF": "refs/heads/fixture", "UNRELATED_SECRET": "never collect"}, clear=True):
            collector.collect("windows", self.root, self.output)
        metadata = json.loads((self.output / "SOURCE.json").read_text())
        self.assertEqual(metadata, {"kind": "windows", "commit": "fixture-commit", "run_id": "42", "ref": "refs/heads/fixture"})
        listed = {}
        for line in (self.output / "SHA256SUMS").read_text().splitlines():
            digest, name = line.split("  ", 1)
            listed[name] = digest
            self.assertEqual(digest, hashlib.sha256((self.output / name).read_bytes()).hexdigest())
        self.assertEqual(set(listed), {"Arkade.exe", "Arkade.msi", "SOURCE.json"})
        self.assertFalse((self.output / "debug.keystore").exists())

    def test_existing_destination_is_not_overwritten(self):
        self.file("src-tauri/target/release/bundle/nsis/Arkade.exe")
        self.file("src-tauri/target/release/bundle/msi/Arkade.msi")
        self.output.mkdir()
        old = self.output / "keep.txt"
        old.write_text("existing data")
        with self.assertRaisesRegex(ValueError, "destination must be empty"):
            collector.collect("windows", self.root, self.output)
        self.assertEqual(old.read_text(), "existing data")


if __name__ == "__main__":
    unittest.main()
