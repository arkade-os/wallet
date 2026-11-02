#[derive(Default)]
pub(super) struct DesktopIntents {
    pending: Vec<String>,
}

impl DesktopIntents {
    pub(super) fn push(&mut self, raw: String) -> bool {
        if raw.len() > 6000
            || raw
                .chars()
                .any(|value| value.is_whitespace() || value.is_control())
        {
            return false;
        }
        let Ok(url) = tauri::Url::parse(&raw) else {
            return false;
        };
        if !matches!(
            url.scheme(),
            "bitcoin" | "lightning" | "arkade" | "web+arkade"
        ) || !url.username().is_empty()
            || url.password().is_some()
            || url.port().is_some()
        {
            return false;
        }
        if self.pending.len() == 2 {
            self.pending.pop();
        }
        self.pending.push(raw);
        true
    }

    pub(super) fn take(&mut self) -> Vec<String> {
        std::mem::take(&mut self.pending)
    }

    pub(super) fn seed_initial(&mut self, snapshot: Vec<String>) {
        if self.pending.is_empty() {
            for url in snapshot {
                self.push(url);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::DesktopIntents;

    #[test]
    fn accepts_wallet_schemes_and_preserves_encoded_content() {
        let mut mailbox = DesktopIntents::default();
        for uri in [
            "bitcoin:bc1ptest?amount=0.001&label=Alice%20Smith",
            "lightning:lnbcrt1test",
            "arkade://pay?address=test",
            "web+arkade://pay?address=test",
        ] {
            assert!(mailbox.push(uri.into()));
            assert_eq!(mailbox.take(), vec![uri]);
        }
    }

    #[test]
    fn rejects_unsafe_or_malformed_urls_without_displacing_pending_links() {
        let mut mailbox = DesktopIntents::default();
        assert!(mailbox.push("bitcoin:first".into()));
        for uri in [
            "https://example.com",
            "file:///tmp/wallet",
            "not-a-url",
            "arkade://user:pass@pay",
            "bitcoin://user@host",
            "arkade://pay:1234",
            "arkade://[broken",
            " bitcoin:test",
            "lightning:test\n",
            "bitcoin:test\0",
            "bitcoin:test\u{1f}",
        ] {
            assert!(!mailbox.push(uri.into()), "accepted {uri:?}");
        }
        assert!(!mailbox.push(format!("bitcoin:{}", "x".repeat(6000))));
        assert_eq!(mailbox.take(), vec!["bitcoin:first"]);
    }

    #[test]
    fn enforces_the_limit_in_utf8_bytes() {
        let mut mailbox = DesktopIntents::default();
        let uri = format!("bitcoin:{}", "x".repeat(5992));
        assert_eq!(uri.len(), 6000);
        assert!(mailbox.push(uri.clone()));
        assert!(!mailbox.push(format!("{uri}x")));
        assert!(!mailbox.push(format!("bitcoin:{}", "é".repeat(3000))));
        assert_eq!(mailbox.take(), vec![uri]);
    }

    #[test]
    fn keeps_first_and_latest_during_a_burst() {
        let mut mailbox = DesktopIntents::default();
        for number in 0..100 {
            assert!(mailbox.push(format!("bitcoin:{number}")));
        }
        assert_eq!(mailbox.take(), vec!["bitcoin:0", "bitcoin:99"]);
    }

    #[test]
    fn drains_once_but_accepts_a_later_intent_with_the_same_url() {
        let mut mailbox = DesktopIntents::default();
        assert!(mailbox.push("bitcoin:test".into()));
        assert_eq!(mailbox.take(), vec!["bitcoin:test"]);
        assert!(mailbox.take().is_empty());
        assert!(mailbox.push("bitcoin:test".into()));
        assert_eq!(mailbox.take(), vec!["bitcoin:test"]);
    }

    #[test]
    fn preserves_observed_events_when_the_cold_snapshot_is_stale() {
        let mut mailbox = DesktopIntents::default();
        for uri in ["bitcoin:first-arrival", "bitcoin:middle", "bitcoin:latest"] {
            assert!(mailbox.push(uri.into()));
        }
        mailbox.seed_initial(vec!["bitcoin:cold".into()]);
        assert_eq!(
            mailbox.take(),
            vec!["bitcoin:first-arrival", "bitcoin:latest"]
        );
        assert!(mailbox.take().is_empty());
    }

    #[test]
    fn does_not_replay_snapshot_links_already_received_by_the_listener() {
        let mut mailbox = DesktopIntents::default();
        assert!(mailbox.push("bitcoin:first".into()));
        assert!(mailbox.push("bitcoin:latest".into()));
        mailbox.seed_initial(vec!["bitcoin:latest".into()]);
        assert_eq!(mailbox.take(), vec!["bitcoin:first", "bitcoin:latest"]);
    }

    #[test]
    fn does_not_prepend_a_snapshot_displaced_by_a_newer_burst() {
        let mut mailbox = DesktopIntents::default();
        assert!(mailbox.push("bitcoin:first".into()));
        assert!(mailbox.push("bitcoin:snapshot".into()));
        let snapshot = vec!["bitcoin:snapshot".into()];
        assert!(mailbox.push("bitcoin:third".into()));
        assert!(mailbox.push("bitcoin:latest".into()));
        mailbox.seed_initial(snapshot);
        assert_eq!(mailbox.take(), vec!["bitcoin:first", "bitcoin:latest"]);
    }

    #[test]
    fn seeds_a_cold_snapshot_without_an_event_and_validates_its_urls() {
        let mut mailbox = DesktopIntents::default();
        mailbox.seed_initial(vec!["bitcoin:cold".into(), "https://example.com".into()]);
        assert_eq!(mailbox.take(), vec!["bitcoin:cold"]);
    }
}
