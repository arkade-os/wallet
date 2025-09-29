#!/bin/bash
set -Eeuo pipefail

function puts {
  echo
  echo -e "\033[1;35m$1\033[0m"
}

function warn {
  echo
  echo -e "\033[1;31m$1\033[0m"
}

function wait_for_cmd {
  local COMMAND="$1"
  local ATTEMPTS=10  # Total number of attempts
  local INTERVAL=1  # Seconds between retries
  
  for ((i=1; i<=ATTEMPTS; i++)); do
    RETURN_CODE=$($COMMAND > /dev/null 2>&1; echo $?)
    if [ "$RETURN_CODE" -eq 0 ]; then
      echo " ✔"
      return 0
    else
      echo "Attempt $i/$ATTEMPTS failed, retrying in $INTERVAL second..."
      sleep $INTERVAL
    fi
  done
  
  echo "Timed out waiting for LND after $((ATTEMPTS * INTERVAL)) seconds."
  return 1
}

function faucet {
  local ADDRESS="$1"
  local AMOUNT="$2"
  local ATTEMPTS=10  # Total number of attempts
  local INTERVAL=1  # Seconds between retries
  
  INITIAL_COUNT=$(curl -s http://localhost:3000/address/$ADDRESS | jq .chain_stats.tx_count)
  
  TXID=$(nigiri faucet $ADDRESS $AMOUNT)
  
  for ((i=1; i<=ATTEMPTS; i++)); do
    NEW_COUNT=$(curl -s http://localhost:3000/address/$ADDRESS | jq .chain_stats.tx_count)
    if [ "$NEW_COUNT" -gt "$INITIAL_COUNT" ]; then
      echo $TXID
      echo " ✔"
      return 0
    else
      echo "Attempt $i/$ATTEMPTS failed, retrying in $INTERVAL second..."
      sleep $INTERVAL
    fi
  done
}

puts "dropping existing docker containers and volumes"
docker compose -f test.docker-compose.yml down -v

puts "stopping nigiri"
nigiri stop --delete

# if argument 'down' is provided, exit after cleanup
if [ $# -eq 1 ]; then
  if [ "$1" == "down" ]; then
    puts "Exiting after cleanup"
    exit 0
  fi
fi

puts "starting nigiri with LND"
nigiri start --ln

puts "waiting for nigiri LND to be ready"
wait_for_cmd "nigiri lnd getinfo"

puts "funding nigiri LND"
nigiri faucet lnd 1

puts "starting boltz LND"
docker compose -f test.docker-compose.yml up -d boltz-lnd
lncli="docker exec -i boltz-lnd lncli --network=regtest"

puts "waiting for boltz LND to be ready"
wait_for_cmd "docker exec boltz-lnd lncli --network=regtest getinfo"

puts "funding boltz LND"
address=$($lncli newaddress p2wkh | jq -r .address)
faucet "$address" 1

puts "connecting lnd instances"
hideOutput=$($lncli connect "$(nigiri lnd getinfo | jq -r .identity_pubkey)"@lnd:9735)
if [ $($lncli listpeers | jq .peers | jq length) -eq 1 ] && [ $(nigiri lnd listpeers | jq .peers | jq length) -eq 1 ]; then
  echo "lnd instances are now connected."
else
  warn "error connecting instances."
  exit 1
fi

puts "opening channel between lnd instances"
# Open a channel with 100k sats
hideOutput=$($lncli openchannel --node_key="$(nigiri lnd getinfo | jq -r .identity_pubkey)" --local_amt=100000)
echo " ✔"

puts "make the channel mature by mining 10 blocks"
hideOutput=$(nigiri rpc --generate 10)
echo " ✔"
sleep 5

puts "send 50k sats to the other side to balance the channel"
invoice=$(nigiri lnd addinvoice --amt 50000 | jq -r .payment_request)
$lncli payinvoice --force $invoice

puts "starting arkd"
docker compose -f test.docker-compose.yml up -d arkd
arkd="docker exec arkd arkd"

puts "waiting for arkd to be ready"
wait_for_cmd "docker exec arkd arkd wallet status"

puts "initializing arkd"
$arkd wallet create --password password
sleep 5

puts "unlocking arkd"
$arkd wallet unlock --password password
sleep 5

puts "fauceting arkd with 5 BTC"
address=$($arkd wallet address)
faucet $address 5

puts "starting fulmine used by boltz"
docker compose -f test.docker-compose.yml up -d boltz-fulmine

sleep 5

puts "generating seed for Fulmine"
seed=$(curl -s -X GET http://localhost:7003/api/v1/wallet/genseed | jq -r .hex)
echo $seed

puts "creating Fulmine wallet with seed"
curl -X POST http://localhost:7003/api/v1/wallet/create \
-H "Content-Type: application/json" \
-d '{"private_key": "'"$seed"'", "password": "password", "server_url": "http://arkd:7070"}' > /dev/null 2>&1
echo " ✔"

sleep 5

puts "unlocking Fulmine wallet"
curl -X POST http://localhost:7003/api/v1/wallet/unlock \
-H "Content-Type: application/json" \
-d '{"password": "password"}' > /dev/null 2>&1
echo " ✔"

sleep 2

puts "getting Fulmine address"
address=$(curl -s -X GET http://localhost:7003/api/v1/address | jq -r '.address | split("?")[0] | split(":")[1]')
echo $address

puts "fauceting Fulmine address"
faucet $address 0.001

puts "settling funds in Fulmine"
curl -X GET http://localhost:7003/api/v1/settle
echo
echo " ✔"

sleep 5

puts "getting lnd url connect"
docker exec boltz-lnd bash -c \
'echo -n "lndconnect://boltz-lnd:10009?cert=$(grep -v CERTIFICATE /root/.lnd/tls.cert \
  | tr -d = | tr "/+" "_-")&macaroon=$(base64 /root/.lnd/data/chain/bitcoin/regtest/admin.macaroon \
| tr -d = | tr "/+" "_-")"' | tr -d '\n' | { command -v pbcopy >/dev/null && pbcopy || cat; }
echo " ✔"

puts "final config: MANUAL INTERVENTION REQUIRED"
echo check fulmine on http://localhost:7003
echo - the single transaction should be settled
echo - connect lnd with the URL copied to clipboard
echo

if [ -t 1 ]; then read -n 1 -p "Press any key to continue..."; fi

puts "starting boltz backend and postgres"
docker compose -f test.docker-compose.yml up -d boltz-postgres boltz

puts "starting cors proxy"
docker compose -f test.docker-compose.yml up -d cors

