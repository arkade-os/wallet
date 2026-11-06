import io
import json
from types import SimpleNamespace
import unittest
from unittest.mock import Mock

from bridge import CardBridge, DEFAULT_PATH, serve


class PresenceTest(unittest.TestCase):
    def card(self):
        connection = Mock(spec=["getATR"])
        connection.getATR.return_value = [0x3B, 0x00]
        connector = SimpleNamespace(card_present=True, card_type="Satochip",
                                    cardservice=SimpleNamespace(connection=connection))
        card = CardBridge(connector, DEFAULT_PATH)
        return card, connection

    def test_locked_presence_does_not_touch_the_card(self):
        card, connection = self.card()
        self.assertEqual({"connected": False}, card.presence())
        connection.getATR.assert_not_called()

    def test_connected_presence_uses_only_existing_pcsc_handle_status(self):
        card, connection = self.card()
        card.public_key = bytes([2]) + bytes(32)
        self.assertEqual({"connected": True}, card.presence())
        connection.getATR.assert_called_once_with()
        self.assertFalse(card.pin_attempted)

    def test_removed_handle_stays_invalid_even_if_reader_returns(self):
        card, connection = self.card()
        card.public_key = bytes([2]) + bytes(32)
        connection.getATR.side_effect = OSError("removed card")
        self.assertEqual({"connected": False}, card.presence())
        connection.getATR.side_effect = None
        self.assertEqual({"connected": False}, card.presence())
        connection.getATR.assert_called_once_with()
        with self.assertRaisesRegex(ValueError, "connection was lost"):
            card.read_status()

    def test_empty_atr_or_unavailable_connector_invalidates_session(self):
        for present, atr in [(False, [0x3B]), (True, [])]:
            with self.subTest(present=present, atr=atr):
                card, connection = self.card()
                card.public_key = bytes([2]) + bytes(32)
                card.connector.card_present = present
                connection.getATR.return_value = atr
                self.assertEqual({"connected": False}, card.presence())
                self.assertTrue(card.connection_lost)

    def test_presence_protocol_is_public_and_does_not_select(self):
        card, connection = self.card()
        card.public_key = bytes([2]) + bytes(32)
        output = io.StringIO()
        serve(card, io.StringIO('{"id":1,"method":"presence"}\n'), output)
        self.assertEqual({"id": 1, "result": {"connected": True}}, json.loads(output.getvalue()))
        connection.getATR.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
