# Swaps

The purpose of this guide is to make you able to test Ark/LN submarine and reverse submarine swaps and walks you through setting a full stack on regtest that includes:

- Ark stack
  - Bitcoind
  - Arkd
- Boltz stack
  - Bitcoind
  - LND
  - Fulmine
  - Boltz backend
- User stack
  - Bitcoind
  - LND
  - Arkade

NOTE: _For sake of simplicity, all stacks use the same Bitcoind instance._

## Requirements

- [Docker](https://docs.docker.com/engine/install/)
- [Nigiri](https://nigiri.vulpem.com/)
- [jq](https://formulae.brew.sh/formula/jq)

## Setup regtest environment

Start regtest environment with Bitcoin and LND:

```sh
nigiri start --ln
```

Fund LND wallet:

```sh
# Faucet 1 BTC
nigiri faucet lnd
```

Start LND used by boltz:

```sh
docker compose -f test.docker-compose.yml up -d boltz-lnd
# Create an alias for lncli
alias lncli="docker exec -it boltz-lnd lncli --network=regtest"
```

Fund LND wallet:

```sh
lncli newaddress p2wkh
# Faucet 1 BTC
nigiri faucet <address>
```

Connect the LND instances:

```sh
lncli connect `nigiri lnd getinfo | jq -r .identity_pubkey`@lnd:9735
# Check the list of peers contains exactly one peer on both sides
lncli listpeers | jq .peers | jq length
nigiri lnd listpeers | jq .peers | jq length
```

Open and fund channel between the LND instances:

```sh
# 100k sats channel Boltz <> User
lncli openchannel --node_key=`nigiri lnd getinfo | jq -r .identity_pubkey` --local_amt=100000
# Make the channel mature by mining 10 blocks
nigiri rpc --generate 10
# Send 50k sats to the other side to balance the channel
nigiri lnd addinvoice --amt 50000
# Type 'yes' when asked
lncli payinvoice <invoice aka payment_request>
```

Start and provision Arkd:

```sh
docker compose -f test.docker-compose.yml up -d arkd
# Create an alias for arkd
alias arkd="docker exec arkd arkd"
# Initialize the wallet
arkd wallet create --password password
# Unlock the service
arkd wallet unlock --password password
# Get an address to deposit funds.
# If it returns error, just wait a few seconds and retry.
arkd wallet address
# Faucet 1 BTC (better if you repeat a few times)
nigiri faucet <address>
```

NOTE: _The Docker services in `test.docker-compose.yml` use temporary volumes; restarting them wipes all state._ **AVOID RESTARTING.**

## Setup Fulmine used by Boltz

Start Fulmine used by Boltz:

```sh
docker compose -f test.docker-compose.yml up -d boltz-fulmine
```

Open [http://localhost:7003](http://localhost:7003) in your browser and initialise/unlock Fulmine — the Arkd URL field is pre-filled.

Go to the receive page, copy the bitcoin address (the second one) and send it some funds:

```sh
# Faucet 100k sats
nigiri faucet <address> 0.001
```

On your browser, go back to homepage of Fulmine, click on the pending tx and settle - click on the action menu, three dots on the top-right.

Lastly, connect Fulmine with Boltz's LND instance. For this, you need an lndconnect URL that you can generate with:

```sh
docker exec -i boltz-lnd bash -c \
  'echo -n "lndconnect://boltz-lnd:10009?cert=$(grep -v CERTIFICATE /root/.lnd/tls.cert \
     | tr -d = | tr "/+" "_-")&macaroon=$(base64 /root/.lnd/data/chain/bitcoin/regtest/admin.macaroon \
     | tr -d = | tr "/+" "_-")"' | tr -d '\n'
```

Copy the generated URL to the clipboard. On Fulmine's tab of your browser, go to Settings > Lightning, paste the URL and click the Connect button.

## Start Boltz backend

Start Boltz backend with:

```sh
docker compose -f test.docker-compose.yml up -d boltz-postgres boltz
```

## Start CORS proxy

Start CORS proxy with:

```sh
docker compose -f test.docker-compose.yml up -d cors
```

## Setup Arkade used by end user

Start Arkade:

```sh
VITE_ARK_SERVER=http://localhost:7070 pnpm start
```

Open [http://localhost:3002](http://localhost:3002) in a new browser tab and initialise/unlock the service.

Go then to the receive page, click Skip, copy the boarding address - the second one - and send it some funds:

```sh
nigiri faucet <address> 0.001
```

On your browser, go back to homepage of Arkade, click on the pending tx and settle.

You're good to go to test submarine and reverse submarine swaps on Ark!

## Test Submarine Swap (Ark => Lightning)

Generate a 5000 sats Lightning invoice:

```sh
nigiri lnd addinvoice --amt 5000
```

Copy the invoice (aka payment_request) and try to pay it on Arkade

After payment, your [transaction history](http://localhost:3002/) should have a new movement of -5.001 sats

Boltz Fulmine's [transaction history](http://localhost:7003/) should have a new movement of +5.001 sats

Your LND channel balance should be 55.000 sats

```sh
nigiri lnd channelbalance | jq .balance
```

## Test Reverse Swap (Lightning => Ark)

In Arkade go to Receive, define an amount of 4.000 sats and click Continue

Copy the Lightning invoice, the fourth one.

Pay the invoice with LND:

```sh
nigiri lnd payinvoice <invoice>
```

Check if you receive the payment on Arkade

After payment, your [transaction history](http://localhost:3002/) should have a new movement of +3.984 sats

Boltz Fulmine's [transaction history](http://localhost:7003/) should have a new movement of -3.984 sats

## Troubleshooting

- If you're on Mac M-family, you have to build the boltz-backend docker image locally:

```sh
# Clone boltz-backend locally
git clone git@github.com:BoltzExchange/boltz-backend.git && cd boltz-backend
# Build the image, the VERSION=ark makes sure that the ark branch of the repo is built.
docker build --build-arg NODE_VERSION=lts-bookworm-slim --build-arg VERSION=ark -t boltz/boltz:ark -f docker/boltz/Dockerfile .
```
