# Swaps

The purpose of this guide is to make you able to test Ark/LN submarine and reverse submarine swaps and walks you through setting up a full stack on regtest that includes:

- Ark stack (Bitcoin, arkd)
- Boltz stack (LND, Fulmine, Boltz backend)
- Banco stack (introspector, bancod) — used as the solver for asset swaps
- User stack (Arkade wallet)

NOTE: _For sake of simplicity, all stacks share the same Bitcoin regtest network managed by the `regtest/` submodule._

## Requirements

- [Docker](https://docs.docker.com/engine/install/)
- [Go](https://go.dev/doc/install) (the regtest scripts build a pinned Nigiri from source)
- [jq](https://formulae.brew.sh/formula/jq)

## Setup regtest environment

Initialize the regtest submodule and start the full stack:

```sh
git submodule update --init
pnpm regtest:start
```

This runs `./regtest/start-env.sh` to bring up Nigiri (Bitcoin + chopsticks + LND + arkd + arkd-wallet + boltz-fulmine + boltz + nginx) and starts the auxiliary docker compose files used by the wallet:

- `docker-compose.nak.yml` — Nostr relay
- `docker-compose.bancod.yml` — introspector + bancod (the banco solver)

To stop everything (preserving data):

```sh
pnpm regtest:stop
```

To wipe all state and remove volumes:

```sh
pnpm regtest:clean
```

## Service URLs

| Service                | URL                        |
| ---------------------- | -------------------------- |
| arkd gRPC              | `localhost:7070`           |
| arkd REST              | `http://localhost:7070`    |
| Boltz REST (via nginx) | `http://localhost:9069`    |
| Boltz Fulmine HTTP UI  | `http://localhost:7002`    |
| Boltz Fulmine API      | `http://localhost:7003`    |
| Introspector REST/gRPC | `http://localhost:7073`    |
| bancod gRPC            | `localhost:7090`           |
| bancod HTTP/REST       | `http://localhost:7091`    |
| Nostr relay (nak)      | `ws://localhost:10547`     |

## Funding the bancod taker bot

`bancod` runs a wallet that needs to be funded so it can fulfill banco offers
posted by makers. Get its offchain address and faucet it via arkd:

```sh
# Get bancod's offchain address
curl -s http://localhost:7091/v1/address | jq -r .offchain_address

# Send funds to it from a separately funded wallet (the wallet's e2e helpers
# do this automatically — see src/test/e2e/bancoHelpers.ts).
```

## Configuring trading pairs

Pairs are added through bancod's REST API. The pair name is `<base>/<quote>`
where each side is either `BTC` or an asset id (`txid:vout`):

```sh
curl -X POST http://localhost:7091/v1/pair \
  -H 'Content-Type: application/json' \
  -d '{
    "pair": {
      "pair": "BTC/<asset_id>",
      "min_amount": 1,
      "max_amount": 100000000,
      "price_feed": "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    }
  }'
```

To remove a pair:

```sh
curl -X DELETE http://localhost:7091/v1/pair/$(printf 'BTC/<asset_id>' | jq -sRr @uri)
```

## Setup Arkade used by end user

Start Arkade pointing at the local arkd and introspector:

```sh
VITE_ARK_SERVER=http://localhost:7070 \
VITE_INTROSPECTOR_URL=http://localhost:7073 \
pnpm start
```

Open [http://localhost:3002](http://localhost:3002) in a new browser tab and initialise/unlock the service.

Go to the receive page, copy the boarding address (the second one) and faucet it:

```sh
nigiri faucet <address> 0.001
```

On your browser, go back to the homepage of Arkade, click on the pending tx and settle.

You're good to go to test submarine and reverse submarine swaps on Ark!

## Test Submarine Swap (Ark => Lightning)

Generate a 5000 sats Lightning invoice:

```sh
nigiri lnd addinvoice --amt 5000
```

Copy the invoice (`payment_request`) and pay it on Arkade.

After payment, your [transaction history](http://localhost:3002/) should have a new movement of -5001 sats.

Boltz Fulmine's [transaction history](http://localhost:7003/) should have a new movement of +5001 sats.

Your LND channel balance should be 55000 sats:

```sh
nigiri lnd channelbalance | jq .balance
```

## Test Reverse Swap (Lightning => Ark)

In Arkade go to Receive, define an amount of 4000 sats and click Continue.

Copy the Lightning invoice (the fourth one).

Pay the invoice with LND:

```sh
nigiri lnd payinvoice <invoice>
```

Check that you receive the payment on Arkade.

After payment, your [transaction history](http://localhost:3002/) should have a new movement of +3984 sats.

Boltz Fulmine's [transaction history](http://localhost:7003/) should have a new movement of -3984 sats.

Your LND channel balance should be 51000 sats:

```sh
nigiri lnd channelbalance | jq .balance
```

## Test Banco Asset Swap

Banco swaps are atomic asset-for-asset (or asset-for-BTC) swaps brokered by
`bancod`. Once a pair is configured and bancod is funded, the wallet's e2e
tests in `src/test/e2e/bancoSwaps.test.ts` exercise the full flow end-to-end:

```sh
pnpm test:e2e -- bancoSwaps
```

## Troubleshooting

- If you're on Mac M-family, you have to build the boltz-backend docker image locally:

```sh
git clone git@github.com:BoltzExchange/boltz-backend.git && cd boltz-backend
docker build --build-arg NODE_VERSION=lts-bookworm-slim --build-arg VERSION=ark -t boltz/boltz:ark -f docker/boltz/Dockerfile .
```
