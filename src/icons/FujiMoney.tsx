export default function FujiMoneyIcon({ big }: { big?: boolean }) {
  const size = big ? 78 : 55
  return <img height={size} width={size} src='/fuji-money.jpg' style={{ borderRadius: '50%' }} />
}
