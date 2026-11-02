package io.arkade.wallet;

import org.junit.Test;
import static org.junit.Assert.*;

public class WalletPolicyTest {
    @Test
    public void onlyBundledOriginsHaveNativeAuthority() {
        assertTrue(WalletPolicy.trustedOrigin("http://tauri.localhost/", false));
        assertTrue(WalletPolicy.trustedOrigin("tauri://localhost/", false));
        assertTrue(WalletPolicy.trustedOrigin("http://127.0.0.1:3002/", true));
        for (String url : new String[] {"https://arkade.money/", "https://wallet.arkade.money", "http://tauri.localhost:8080/", "http://user@tauri.localhost/", "https://tauri.localhost.evil.test/", "file:///wallet.html"}) {
            assertFalse(WalletPolicy.trustedOrigin(url, true));
        }
        assertFalse(WalletPolicy.trustedOrigin("http://127.0.0.1:3002/", false));
    }

    @Test
    public void externalIntentsAreDataFromAnAllowlistedScheme() {
        for (String url : new String[] {"bitcoin:bc1qexample?amount=1", "lightning:lnbcexample", "web+arkade://connect?callback=https%3A%2F%2Fexample.com", "arkade://send?request=bitcoin%3Abc1example"}) {
            assertTrue(url, WalletPolicy.allowedIntent(url));
        }
        for (String url : new String[] {"javascript:alert(1)", "file:///etc/passwd", "intent://send", "https://wallet.arkade.money.evil.test", "https://user@wallet.arkade.money/", "http://wallet.arkade.money/", "web+arkade://unknown", "bitcoin:", "bitcoin:abc%00", "lightning:abc\n", "bitcoin:" + "x".repeat(6000)}) {
            assertFalse(url, WalletPolicy.allowedIntent(url));
        }
    }

    @Test
    public void httpsWalletLinksMatchTheFrontendRootContract() {
        String query = "?action=connect&callback=https%3A%2F%2Fexample.com";
        for (String root : new String[] {"https://arkade.money", "https://arkade.money/", "https://ARKADE.MONEY/", "https://arkade.money:443/"}) {
            assertTrue(root, WalletPolicy.allowedIntent(root + query));
        }
        assertTrue(WalletPolicy.allowedIntent("https://arkade.money/?action=send&request=bitcoin%3Atb1qtest%3Famount%3D0.0001"));
        for (String root : new String[] {"https://wallet.arkade.money/", "https://arkade.money.evil.test/", "http://arkade.money/", "https://user@arkade.money/", "https://arkade.money:444/", "https://arkade.money/elsewhere", "https://arkade.money/%2F"}) {
            assertFalse(root, WalletPolicy.allowedIntent(root + query));
        }
    }
}
