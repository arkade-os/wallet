#!/bin/bash

function puts {
  echo
  echo -e "\033[1;35m$1\033[0m"
}

function warn {
  echo
  echo -e "\033[1;31m$1\033[0m"
}

puts "dropping existing docker containers"
docker compose -f test.docker-compose.yml down

puts "stopping nigiri"
nigiri stop --delete

puts "removing docker volumes"
docker volume rm $(docker volume ls -q)

sleep 2

puts "starting nigiri with LND"
nigiri start --ln

sleep 10

puts "funding nigiri lnd"
nigiri faucet lnd

puts "starting boltz lnd"
docker compose -f test.docker-compose.yml up -d boltz-lnd
lncli="docker exec -it boltz-lnd lncli --network=regtest"

sleep 5

puts "funding boltz lnd"
address=$($lncli newaddress p2wkh | jq -r .address | cut -c1-45)
nigiri faucet $address

sleep 5

puts "connecting lnd instances"
hideOutput=$($lncli connect `nigiri lnd getinfo | jq -r .identity_pubkey`@lnd:9735)
if [ $($lncli listpeers | jq .peers | jq length) -eq 1 ] && [ $(nigiri lnd listpeers | jq .peers | jq length) -eq 1 ]; then
  echo "lnd instances are now connected."
else
  warn "error connecting instances."
  exit 1
fi

puts "opening channel between lnd instances"
# Open a channel with 100k sats
hideOutput=$($lncli openchannel --node_key=`nigiri lnd getinfo | jq -r .identity_pubkey` --local_amt=100000)
echo " ✔"

puts "make the channel mature by mining 10 blocks"
hideOutput=$(nigiri rpc --generate 10)
echo " ✔"
sleep 5

puts "send 50k sats to the other side to balance the channel"
invoice=$(nigiri lnd addinvoice --amt 5000 | jq -r .payment_request)
$lncli payinvoice --force $invoice

puts "starting arkd"
docker compose -f test.docker-compose.yml up -d arkd
arkd="docker exec arkd arkd"
sleep 5

puts "initializing arkd"
$arkd wallet create --password password
sleep 5

puts "unlocking arkd"
$arkd wallet unlock --password password
sleep 5

# Get an address to deposit funds.
address=$($arkd wallet address)
# Faucet 5 BTC
nigiri faucet $address 5

puts "starting fulmine used by boltz"
docker compose -f test.docker-compose.yml up -d boltz-fulmine

sleep 5

puts "generating seed for Fulmine"
seed=$(curl -X GET http://localhost:7003/api/v1/wallet/genseed | jq -r .hex)
echo $seed

puts "creating Fulmine wallet with seed"
curl -X POST http://localhost:7003/api/v1/wallet/create \
-H "Content-Type: application/json" \
-d '{"private_key": "'"$seed"'", "password": "password", "server_url": "http://arkd:7070"}'

sleep 5

puts "unlocking Fulmine wallet"
curl -X POST http://localhost:7003/api/v1/wallet/unlock \
-H "Content-Type: application/json" \
-d '{"password": "password"}'

sleep 2

puts "getting Fulmine address"
address=$(curl -X GET http://localhost:7003/api/v1/address | jq -r '.address | split("?")[0] | split(":")[1]')
echo $address

puts "fauceting Fulmine address"
nigiri faucet $address 0.001

sleep 5

puts "settling funds in Fulmine"
curl -X GET http://localhost:7003/api/v1/settle

puts "getting lnd url connect"
docker exec -i boltz-lnd bash -c \
'echo -n "lndconnect://boltz-lnd:10009?cert=$(grep -v CERTIFICATE /root/.lnd/tls.cert \
| tr -d = | tr "/+" "_-")&macaroon=$(base64 /root/.lnd/data/chain/bitcoin/regtest/admin.macaroon \
| tr -d = | tr "/+" "_-")"' | tr -d '\n' | pbcopy

echo
echo check fulmine on http://localhost:7003
echo - the single transaction should be settled
echo - connect lnd with the URL copied to clipboard
echo

read -n 1 -p "Press any key to continue..."

puts "starting boltz backend and postgres"
docker compose -f test.docker-compose.yml up -d boltz-postgres boltz

puts "starting cors proxy"
docker compose -f test.docker-compose.yml up -d cors

