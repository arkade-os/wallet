import io
import json
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from bridge import CardBridge, DEFAULT_PATH, serve


class SetupTest(unittest.TestCase):
    def setUp(self):
        self.state = {
            "protocol_major_version": 0, "protocol_minor_version": 16,
            "applet_major_version": 0, "applet_minor_version": 1,
            "setup_done": False, "is_seeded": False, "needs2FA": False,
            "feature_schnorr_policy": 0, "feature_nostr_policy": 0,
        }
        self.connector = Mock(card_present=True, card_type="Satochip", needs_secure_channel=True)
        self.connector.cardservice = SimpleNamespace(connection=SimpleNamespace(getReader=lambda: "Mock reader"))
        self.connector.card_get_status.side_effect = lambda: ([], 0x90, 0x00, self.state)
        self.connector.card_verify_PIN_simple.return_value = ([], 0x90, 0x00)
        self.connector.card_setup.side_effect = self.finish_setup
        self.connector.card_bip32_import_seed.side_effect = self.finish_import
        self.public_key = bytes.fromhex("0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")
        key = Mock()
        key.get_public_key_bytes.return_value = self.public_key
        self.connector.card_bip32_get_extendedkey.return_value = key, bytes(32)
        self.card = CardBridge(self.connector, DEFAULT_PATH)
        self.pin, self.puk, self.seed = "001234", "0123456789abcdef", "42" * 64

    def finish_setup(self, *args):
        self.state["setup_done"] = True
        return [], 0x90, 0x00

    def finish_import(self, seed):
        self.state["is_seeded"] = True

    def test_blank_inspection_does_not_verify_or_write(self):
        self.assertFalse(self.card.get_status()["ready"])
        self.connector.card_verify_PIN_simple.assert_not_called()
        self.connector.card_setup.assert_not_called()

    def test_seeded_card_is_refused_before_pin_or_setup(self):
        self.state.update(setup_done=True, is_seeded=True)
        with self.assertRaisesRegex(ValueError, "already seeded"):
            self.card.setup(self.pin, self.puk, self.seed)
        self.connector.card_verify_PIN_simple.assert_not_called()
        self.connector.card_setup.assert_not_called()
        self.connector.card_bip32_import_seed.assert_not_called()

    def test_fresh_setup_preserves_recovery_code_and_verifies_once(self):
        self.assertTrue(self.card.setup(self.pin, self.puk, self.seed)["ready"])
        args = self.connector.card_setup.call_args.args
        self.assertEqual(args[:6], (5, 3, self.pin, self.puk, 1, 1))
        self.assertEqual([len(value) for value in args[6:8]], [16, 16])
        self.assertEqual(args[8:], (32, 0, 1, 1, 1))
        self.connector.card_verify_PIN_simple.assert_called_once_with(self.pin)
        self.connector.card_bip32_import_seed.assert_called_once_with(bytes.fromhex(self.seed))
        self.connector.set_pin.assert_called_with(0, None)

    def test_partial_setup_preserves_existing_pin_and_recovery_code(self):
        self.state["setup_done"] = True
        with patch("bridge.os.urandom", side_effect=AssertionError("No recovery regeneration")):
            self.assertTrue(self.card.setup(self.pin, None, self.seed)["ready"])
        self.connector.card_setup.assert_not_called()
        self.connector.card_verify_PIN_simple.assert_called_once_with(self.pin)

    def test_setup_returns_the_key_from_the_same_authenticated_session(self):
        result = self.card.setup(self.pin, self.puk, self.seed)
        self.assertEqual(result["publicKey"], self.public_key.hex())
        self.connector.card_bip32_get_extendedkey.assert_called_once_with(DEFAULT_PATH)
        self.assertEqual(self.card.info(), {"publicKey": result["publicKey"], "version": "0.16-0.1"})
        self.connector.card_verify_PIN_simple.assert_called_once_with(self.pin)

    def test_setup_cannot_succeed_without_deriving_the_initialized_key(self):
        self.connector.card_bip32_get_extendedkey.side_effect = ValueError("Card removed during key verification")
        with self.assertRaisesRegex(ValueError, "Card removed"):
            self.card.setup(self.pin, self.puk, self.seed)
        self.assertIsNone(self.card.public_key)
        self.connector.card_verify_PIN_simple.assert_called_once_with(self.pin)

    def test_failed_pin_does_not_retry_or_import(self):
        self.state["setup_done"] = True
        self.connector.card_verify_PIN_simple.return_value = ([], 0x63, 0xC2)
        for message in ["63c2", "restart"]:
            with self.assertRaisesRegex(ValueError, message):
                self.card.setup(self.pin, None, self.seed)
        self.connector.card_verify_PIN_simple.assert_called_once()
        self.connector.card_bip32_import_seed.assert_not_called()
        self.connector.set_pin.assert_called_with(0, None)

    def test_missing_recovery_code_and_unknown_seed_state_fail_before_writes(self):
        with self.assertRaisesRegex(ValueError, "PUK"):
            self.card.setup(self.pin, None, self.seed)
        del self.state["is_seeded"]
        with self.assertRaisesRegex(ValueError, "status"):
            self.card.setup(self.pin, self.puk, self.seed)
        self.connector.card_setup.assert_not_called()

    def test_import_failure_keeps_partial_status_without_retry(self):
        self.connector.card_bip32_import_seed.side_effect = ValueError("Import failed")
        with self.assertRaisesRegex(ValueError, "Import failed"):
            self.card.setup(self.pin, self.puk, self.seed)
        self.assertTrue(self.card.get_status()["setupDone"])
        self.assertFalse(self.card.get_status()["seeded"])
        with self.assertRaisesRegex(ValueError, "restart"):
            self.card.setup(self.pin, self.puk, self.seed)
        self.connector.card_verify_PIN_simple.assert_called_once()

    def test_unsupported_policies_and_secure_channel_fail_before_writes(self):
        self.state["feature_nostr_policy"] = 1
        with self.assertRaisesRegex(ValueError, "policies"):
            self.card.setup(self.pin, self.puk, self.seed)
        self.state["feature_nostr_policy"] = 0
        self.connector.needs_secure_channel = False
        with self.assertRaisesRegex(ValueError, "secure channel"):
            self.card.setup(self.pin, self.puk, self.seed)
        self.connector.card_setup.assert_not_called()

    def test_rpc_errors_never_echo_setup_secrets(self):
        request = {"id": 1, "method": "setup", "pin": self.pin, "puk": self.puk, "seed": self.seed}
        output = io.StringIO()
        with patch.object(self.card, "setup", side_effect=ValueError(self.pin + self.puk + self.seed)):
            serve(self.card, io.StringIO(json.dumps(request) + "\n"), output)
        self.assertEqual(json.loads(output.getvalue()), {"id": 1, "error": "[redacted]" * 3})


if __name__ == "__main__":
    unittest.main()
