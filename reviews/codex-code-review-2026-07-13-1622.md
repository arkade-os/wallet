# Codex code review — swap activity redesign

- Scope: all uncommitted changes on `wt-redesign-swap-activity-20260713`
- Base: remote draft swap PR branch `origin/wt-port-swap-ui-20260707`
- Reviewer: Codex GPT-5.5
- Rounds: 3
- Final verdict: approved

## Round 1

Verdict: revise.

The reviewer found that the swap detail's From and To amounts remained visible when balance privacy was enabled. The hero and activity-list value were already masked, but the detail table received plain formatted strings.

## Resolution

- Changed swap asset amount formatting to return visible and masked values.
- Made `Details` select the masked value when `config.showBalance` is false.
- Added a regression test covering both From and To values with hidden balances.

## Round 2

Verdict: approved.

The reviewer verified that the rendered and copied detail values are masked when balances are hidden. The focused test suite and lint checks passed, and no new substantive issues were found.

## Round 3

Verdict: approved.

The reviewer verified the final placeholder behavior: swap fees and transaction IDs stay visible as `Not available yet` when source data is missing, while real persisted values take precedence. The focused tests, lint checks, and diff validation passed with no new substantive issues.
