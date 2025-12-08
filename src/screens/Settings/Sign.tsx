import Header from './Header'
import Text from '../../components/Text'
import Content from '../../components/Content'
import { useContext, useEffect, useState } from 'react'
import { prettyAgo, prettyLongText } from '../../lib/format'
import { clearLogs, getLogs, LogLine } from '../../lib/logs'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { EmptyList } from '../../components/Empty'
import { WalletContext } from '../../providers/wallet'
import { hex } from '@scure/base'
import Input from '../../components/Input'
import { getPrivateKey } from '../../lib/privateKey'
import { schnorr } from '@noble/curves/secp256k1'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

function LogsTable({ logs }: { logs: LogLine[] }) {
  const color = (level: string): string => {
    if (level === 'info') return ''
    if (level === 'warn') return 'orange'
    if (level === 'error') return 'red'
    return ''
  }

  const numChars = (v: string) => Math.floor((36 - v.length) / 2)

  if (logs.length === 0) {
    return <EmptyList text='No logs available' secondaryText='Start using the app to generate logs.' />
  }

  return (
    <div style={{ margin: '1rem' }}>
      <FlexCol gap='0.5rem'>
        {[...logs].reverse().map(({ time, msg, level }) => (
          <FlexRow between key={`${time}${msg}`}>
            <Text color={color(level)}>{prettyAgo(time)}</Text>
            <Text color='dark50' copy={msg}>
              {prettyLongText(msg.replace('...', ''), numChars(prettyAgo(time)))}
            </Text>
          </FlexRow>
        ))}
      </FlexCol>
    </div>
  )
}

type PendingTransaction = {
  vtxo: {
    txid: string
    vout: number
    value: number
  }
  arkTx: Uint8Array // The Ark transaction as PSBT (array for storage, Uint8Array for processing)
  checkpoints: Uint8Array[] // Checkpoint transactions as PSBTs (arrays for storage, Uint8Arrays for processing)
}

function toPendingTransaction(input: string): PendingTransaction {
  const { vtxo, arkTx, checkpoints } = JSON.parse(input)
  return {
    vtxo,
    arkTx: new Uint8Array(arkTx),
    checkpoints: checkpoints.map((c) => new Uint8Array(c)),
  }
}

export default function Sign() {
  const { svcWallet } = useContext(WalletContext)
  const pubkey = svcWallet?.xOnlyPublicKey()

  const [hashToSign, setHashToSign] = useState<string | undefined>()
  const [transactionToSign, setTransactionToSign] = useState<PendingTransaction | undefined>()
  const [signatureHex, setSignatureHex] = useState<string | undefined>()

  const signChallenge = async () => {
    if (!hashToSign) return
    const password = prompt('Password')
    if (!password) return
    const privkey = await getPrivateKey(password)
    const signatureBytes = schnorr.sign(hexToBytes(hashToSign), privkey)
    setSignatureHex(bytesToHex(signatureBytes))
  }

  return (
    <>
      <Header back text='Sign' />
      <Content>
        <FlexCol gap='0.5rem'>
          <FlexRow between>
            <Text>Public key</Text>
            <Text>{pubkey ? prettyLongText(hex.encode(pubkey), 12) : '-'}</Text>
            <Button label='copy' onClick={() => navigator.clipboard.writeText(pubkey ? hex.encode(pubkey) : '')} />
          </FlexRow>
          <FlexRow between>
            <Text>Hash to sign</Text>
            <Input onChange={(d) => setHashToSign(d as string)} />
          </FlexRow>
          <FlexRow between>
            <Button label='Sign challenge' onClick={signChallenge} />
          </FlexRow>
          <FlexRow between>
            <Text>Signature Hex</Text>
            <Text>{signatureHex}</Text>
          </FlexRow>
        </FlexCol>
        <FlexRow between>
          <Text>Transaction to sign</Text>
          <Input
            onChange={(d) => {
              const tx = toPendingTransaction(d as string)
              setTransactionToSign(tx)
            }}
          />{' '}
        </FlexRow>
      </Content>
      <ButtonsOnBottom>
        <Text>Sign</Text>
      </ButtonsOnBottom>
    </>
  )
}
