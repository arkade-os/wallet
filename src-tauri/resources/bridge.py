import argparse
import getpass
import importlib
import json
import logging
import os
import re
import sys
import warnings


MINIMUM_VERSION = (0, 16, 0, 1)
DEFAULT_PATH = "m/86'/1'/0'/0/0"


def checked(result, operation):
    if result[1:3] != (0x90, 0x00):
        raise ValueError(f"{operation} failed (status {result[1]:02x}{result[2]:02x})")
    return result[0]


def hex_bytes(value, label, lengths):
    if not isinstance(value, str) or not re.fullmatch(r"(?:[0-9a-fA-F]{2})*", value):
        raise ValueError(f"Invalid {label}: expected hexadecimal bytes")
    decoded = bytes.fromhex(value)
    if len(decoded) not in lengths:
        raise ValueError(f"Invalid {label} length: expected {lengths} bytes")
    return decoded


class CardBridge:
    def __init__(self, connector, path):
        if not re.fullmatch(r"m(?:/[0-9]+'?){1,10}", path):
            raise ValueError("Invalid BIP32 path")
        if any(int(component.rstrip("'")) >= 0x80000000 for component in path.split("/")[1:]):
            raise ValueError("Invalid BIP32 child index")
        self.connector = connector
        self.path = path
        self.public_key = None
        self.version = None
        self.pin_attempted = False
        self.connection_lost = False

    def presence(self):
        if self.public_key is None or self.connection_lost:
            return {"connected": False}
        cc = self.connector
        try:
            connected = (cc.card_present and cc.card_type == "Satochip" and
                         bool(cc.cardservice.connection.getATR()))
        except Exception:
            connected = False
        if not connected:
            self.connection_lost = True
        return {"connected": bool(connected)}

    def read_status(self):
        if self.connection_lost:
            raise ValueError("Card connection was lost; reconnect the intended Satochip")
        cc = self.connector
        if not cc.card_present or cc.card_type != "Satochip":
            raise ValueError("No Satochip card present; insert a Satochip in a PC/SC reader")
        result = cc.card_get_status()
        if result[1:3] == (0x9C, 0x04):
            raise ValueError("Satochip is not initialized; initialize it with an existing wallet first")
        checked(result, "Get status")
        status = result[3]
        version = tuple(status.get(name, -1) for name in (
            "protocol_major_version", "protocol_minor_version",
            "applet_major_version", "applet_minor_version",
        ))
        if (any(type(part) is not int or not 0 <= part <= 255 for part in version) or
                any(type(status.get(field)) is not bool for field in ("setup_done", "is_seeded", "needs2FA"))):
            raise ValueError("Card returned incomplete or invalid Satochip status")
        if version < MINIMUM_VERSION:
            raise ValueError("Satochip applet 0.16-0.1 or later is required")
        state = {
            "reader": str(cc.cardservice.connection.getReader()),
            "present": True,
            "version": f"{version[0]}.{version[1]}-{version[2]}.{version[3]}",
            "setupDone": status.get("setup_done") is True,
            "seeded": status.get("is_seeded") is True,
            "needs2FA": status.get("needs2FA") is not False,
            "schnorrEnabled": status.get("feature_schnorr_policy") == 0,
            "untweakedSchnorrEnabled": status.get("feature_nostr_policy") == 0,
        }
        state["ready"] = (state["setupDone"] and state["seeded"] and not state["needs2FA"]
                          and state["schnorrEnabled"] and state["untweakedSchnorrEnabled"])
        return state

    def require_policies(self, state):
        if state["needs2FA"]:
            raise ValueError("2FA-enabled Satochip cards are not supported by this PoC")
        if not state["schnorrEnabled"] or not state["untweakedSchnorrEnabled"]:
            raise ValueError("Satochip Schnorr and Nostr signing policies must both be enabled")

    def status(self):
        state = self.read_status()
        if not state["setupDone"] or not state["seeded"]:
            raise ValueError("Satochip must already be initialized and seeded")
        self.require_policies(state)
        return state["version"]

    def get_status(self):
        state = self.read_status()
        if self.public_key is not None:
            if not state["ready"]:
                raise ValueError("Satochip identity is no longer ready; disconnect and reconnect the intended card")
            self.derive()
        return state

    def setup(self, pin, puk, seed):
        if not isinstance(pin, str) or not re.fullmatch(r"[0-9]{6,16}", pin):
            raise ValueError("PIN must contain 6 to 16 ASCII digits")
        if puk is not None and (not isinstance(puk, str) or not re.fullmatch(r"[0-9a-fA-F]{16}", puk)):
            raise ValueError("PUK must contain exactly 16 ASCII hexadecimal characters")
        seed = hex_bytes(seed, "BIP39 seed", (64,))
        state = self.read_status()
        if state["seeded"]:
            raise ValueError("Satochip is already seeded; refusing to replace its wallet")
        if not state["setupDone"] and puk is None:
            raise ValueError("PUK is required for a fresh setup: provide exactly 16 ASCII hexadecimal characters")
        self.require_policies(state)
        if self.pin_attempted:
            raise ValueError("PIN was already attempted; restart the bridge to try again")
        cc = self.connector
        if not cc.needs_secure_channel:
            raise ValueError("Satochip setup requires a secure channel")
        cc.card_ensure_secure_channel()
        if not state["setupDone"]:
            try:
                checked(cc.card_setup(5, 3, pin, puk, 1, 1, os.urandom(16), os.urandom(16),
                                      32, 0, 1, 1, 1), "Card setup")
            finally:
                cc.set_pin(0, None)
        self.verify_pin(pin)
        cc.card_bip32_import_seed(seed)
        state = self.read_status()
        if not state["setupDone"] or not state["seeded"]:
            raise ValueError("Satochip setup is incomplete; read card status before retrying")
        self.require_policies(state)
        self.public_key = self.derive()
        self.version = state["version"]
        return {**state, "publicKey": self.public_key.hex()}

    def verify_pin(self, pin):
        if self.pin_attempted:
            raise ValueError("PIN was already attempted; restart the bridge to try again")
        self.pin_attempted = True
        try:
            checked(self.connector.card_verify_PIN_simple(pin), "PIN verification")
        finally:
            self.connector.set_pin(0, None)

    def derive(self):
        key, _ = self.connector.card_bip32_get_extendedkey(self.path)
        key = bytes(key.get_public_key_bytes(compressed=True))
        if len(key) != 33 or key[0] not in (2, 3):
            raise ValueError("Card returned an invalid compressed public key")
        if self.public_key is not None and key != self.public_key:
            raise ValueError("Satochip identity changed; restart with the intended card")
        return key

    def info(self, pin=None):
        version = self.status()
        if self.public_key is None:
            if self.pin_attempted:
                raise ValueError("PIN was already attempted; restart the bridge to try again")
            if pin is None:
                pin = os.environ.pop("SATOCHIP_PIN", None)
            if pin is None:
                try:
                    with warnings.catch_warnings():
                        warnings.simplefilter("error", getpass.GetPassWarning)
                        pin = getpass.getpass("Satochip PIN (one attempt): ", stream=sys.stderr)
                except (EOFError, KeyboardInterrupt, getpass.GetPassWarning) as exc:
                    raise ValueError("PIN entry cancelled or no terminal available; set SATOCHIP_PIN") from exc
            if not pin:
                raise ValueError("PIN entry cancelled")
            self.verify_pin(pin)
            pin = None
            self.public_key = self.derive()
            self.version = version
        else:
            self.derive()
        return {"publicKey": self.public_key.hex(), "version": self.version}

    def sign(self, method, digest, tweak=None):
        if method not in ("schnorr", "ecdsa"):
            raise ValueError("Unknown signing method")
        digest = hex_bytes(digest, "hash", (32,))
        root = None if tweak is None else hex_bytes(tweak, "tweak", (0, 32))
        if method == "ecdsa" and tweak is not None:
            raise ValueError("ECDSA does not accept a Taproot tweak")
        if self.public_key is None:
            raise ValueError("Call info before signing")
        self.status()
        self.derive()
        cc = self.connector
        if method == "schnorr":
            checked(cc.card_taproot_tweak_privkey(0xFF, root, bypass_flag=tweak is None), "Taproot tweak")
            signature = bytes(checked(cc.card_sign_schnorr_hash(0xFF, list(digest), None), "Schnorr signing"))
            if len(signature) != 64:
                raise ValueError("Card returned an invalid Schnorr signature length")
        else:
            signature = bytes(checked(cc.card_sign_transaction_hash(0xFF, list(digest), None), "ECDSA signing"))
            if not 8 <= len(signature) <= 72 or signature[0] != 0x30 or signature[1] != len(signature) - 2:
                raise ValueError("Card returned an invalid DER signature")
        return {"signature": signature.hex()}


def serve(card, source, output):
    for line in source:
        request_id = None
        request = None
        try:
            request = json.loads(line)
            if not isinstance(request, dict) or type(request.get("id")) is not int:
                raise ValueError("Request must have an integer id")
            request_id = request["id"]
            method = request.get("method")
            if method == "info":
                result = card.info(request.get("pin"))
            elif method == "status":
                result = card.get_status()
            elif method == "presence":
                result = card.presence()
            elif method == "setup":
                result = card.setup(request.get("pin"), request.get("puk"), request.get("seed"))
            elif method in ("schnorr", "ecdsa"):
                result = card.sign(method, request.get("hash"), request.get("tweak"))
            else:
                raise ValueError("Unknown bridge method")
            response = {"id": request_id, "result": result}
        except Exception as exc:
            message = str(exc)
            if isinstance(request, dict):
                secrets = [request.get(field) for field in ("pin", "puk", "seed")]
                for secret in sorted((value for value in secrets if isinstance(value, str) and value), key=len, reverse=True):
                    message = message.replace(secret, "[redacted]")
            response = {"id": request_id, "error": message}
        output.write(json.dumps(response) + "\n")
        output.flush()
        request = None
        line = None


class PassiveMonitor:
    def addObserver(self, observer):
        pass


def connect():
    from smartcard.System import readers

    if not readers():
        raise ValueError("No PC/SC smart-card reader found")
    connector_module = importlib.import_module("pysatochip.CardConnector")
    monitor_factory = connector_module.CardMonitor
    # Disable registration before construction: removing an observer cannot cancel an in-flight SELECT.
    connector_module.CardMonitor = PassiveMonitor
    try:
        cc = connector_module.CardConnector(loglevel=logging.CRITICAL, card_filter=["satochip"])
    finally:
        connector_module.CardMonitor = monitor_factory
    if not cc.card_present or cc.cardservice is None:
        raise ValueError("No Satochip card found; insert an initialized card")
    cc.cardservice.connection.connect()
    checked(cc.card_select(), "Select Satochip")
    return cc


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", default=DEFAULT_PATH)
    arguments = parser.parse_args()
    cc = None
    try:
        cc = connect()
        serve(CardBridge(cc, arguments.path), sys.stdin, sys.stdout)
    except Exception as exc:
        print(f"Satochip bridge: {exc}", file=sys.stderr)
        return 1
    finally:
        if cc is not None:
            cc.card_disconnect()
    return 0


if __name__ == "__main__":
    sys.exit(main())
