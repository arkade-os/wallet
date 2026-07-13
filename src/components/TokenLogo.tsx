import { walletAccountTicker } from '../lib/accountAssets'

export type TokenLogoTicker = 'BTC' | 'USD' | 'USDT' | 'USDC' | 'CHF' | 'BRL' | 'CNY' | 'EUR' | 'GBP' | 'JPY'

export function tokenLogoTickerForTicker(ticker: string | undefined): TokenLogoTicker | undefined {
  const normalized = ticker?.trim().toUpperCase()
  if (
    normalized === 'BTC' ||
    normalized === 'USD' ||
    normalized === 'USDT' ||
    normalized === 'USDC' ||
    normalized === 'CHF' ||
    normalized === 'BRL' ||
    normalized === 'CNY' ||
    normalized === 'EUR' ||
    normalized === 'GBP' ||
    normalized === 'JPY'
  ) {
    return normalized
  }
}

export function accountTickerForAssetTicker(ticker: string | undefined): TokenLogoTicker | undefined {
  return walletAccountTicker(ticker)
}

export default function TokenLogo({ ticker }: { ticker: TokenLogoTicker }) {
  if (ticker === 'USD') return <UnitedStatesFlagLogo />
  if (ticker === 'USDT') return <TetherLogo />
  if (ticker === 'USDC') return <UsdcLogo />
  if (ticker === 'CHF') return <SwitzerlandFlagLogo />
  if (ticker === 'BRL') return <BrazilFlagLogo />
  if (ticker === 'CNY') return <ChinaFlagLogo />
  if (ticker === 'EUR') return <EuropeanUnionFlagLogo />
  if (ticker === 'GBP') return <UnitedKingdomFlagLogo />
  if (ticker === 'JPY') return <JapanFlagLogo />
  return <BitcoinLogo />
}

export function BitcoinLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <g fill='none' fillRule='evenodd'>
        <circle cx='16' cy='16' r='16' fill='var(--orange-500)' />
        <path
          fill='#FFF'
          fillRule='nonzero'
          d='M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z'
        />
      </g>
    </svg>
  )
}

export function TetherLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <g fill='none' fillRule='evenodd'>
        <circle cx='16' cy='16' r='16' fill='#26A17B' />
        <path
          fill='#FFF'
          d='M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117'
        />
      </g>
    </svg>
  )
}

export function UsdcLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <g fill='none'>
        <circle fill='#3E73C4' cx='16' cy='16' r='16' />
        <g fill='#FFF'>
          <path d='M20.022 18.124c0-2.124-1.28-2.852-3.84-3.156-1.828-.243-2.193-.728-2.193-1.578 0-.85.61-1.396 1.828-1.396 1.097 0 1.707.364 2.011 1.275a.458.458 0 00.427.303h.975a.416.416 0 00.427-.425v-.06a3.04 3.04 0 00-2.743-2.489V9.142c0-.243-.183-.425-.487-.486h-.915c-.243 0-.426.182-.487.486v1.396c-1.829.242-2.986 1.456-2.986 2.974 0 2.002 1.218 2.791 3.778 3.095 1.707.303 2.255.668 2.255 1.639 0 .97-.853 1.638-2.011 1.638-1.585 0-2.133-.667-2.316-1.578-.06-.242-.244-.364-.427-.364h-1.036a.416.416 0 00-.426.425v.06c.243 1.518 1.219 2.61 3.23 2.914v1.457c0 .242.183.425.487.485h.915c.243 0 .426-.182.487-.485V21.34c1.829-.303 3.047-1.578 3.047-3.217z' />
          <path d='M12.892 24.497c-4.754-1.7-7.192-6.98-5.424-11.653.914-2.55 2.925-4.491 5.424-5.402.244-.121.365-.303.365-.607v-.85c0-.242-.121-.424-.365-.485-.061 0-.183 0-.244.06a10.895 10.895 0 00-7.13 13.717c1.096 3.4 3.717 6.01 7.13 7.102.244.121.488 0 .548-.243.061-.06.061-.122.061-.243v-.85c0-.182-.182-.424-.365-.546zm6.46-18.936c-.244-.122-.488 0-.548.242-.061.061-.061.122-.061.243v.85c0 .243.182.485.365.607 4.754 1.7 7.192 6.98 5.424 11.653-.914 2.55-2.925 4.491-5.424 5.402-.244.121-.365.303-.365.607v.85c0 .242.121.424.365.485.061 0 .183 0 .244-.06a10.895 10.895 0 007.13-13.717c-1.096-3.46-3.778-6.07-7.13-7.162z' />
        </g>
      </g>
    </svg>
  )
}

export function UnitedStatesFlagLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <defs>
        <clipPath id='us-flag-circle'>
          <circle cx='16' cy='16' r='16' />
        </clipPath>
      </defs>
      <g clipPath='url(#us-flag-circle)'>
        <path fill='#FFF' d='M0 0h32v32H0z' />
        <path
          fill='#B22234'
          d='M0 0h32v2.46H0zm0 4.92h32v2.46H0zm0 4.92h32v2.46H0zm0 4.93h32v2.46H0zm0 4.92h32v2.46H0zm0 4.92h32v2.46H0zm0 4.93h32V32H0z'
        />
        <path fill='#3C3B6E' d='M0 0h16.8v17.23H0z' />
        <g fill='#FFF'>
          <circle cx='2.4' cy='2.15' r='0.55' />
          <circle cx='5.2' cy='2.15' r='0.55' />
          <circle cx='8' cy='2.15' r='0.55' />
          <circle cx='10.8' cy='2.15' r='0.55' />
          <circle cx='13.6' cy='2.15' r='0.55' />
          <circle cx='3.8' cy='4.25' r='0.55' />
          <circle cx='6.6' cy='4.25' r='0.55' />
          <circle cx='9.4' cy='4.25' r='0.55' />
          <circle cx='12.2' cy='4.25' r='0.55' />
          <circle cx='2.4' cy='6.35' r='0.55' />
          <circle cx='5.2' cy='6.35' r='0.55' />
          <circle cx='8' cy='6.35' r='0.55' />
          <circle cx='10.8' cy='6.35' r='0.55' />
          <circle cx='13.6' cy='6.35' r='0.55' />
          <circle cx='3.8' cy='8.45' r='0.55' />
          <circle cx='6.6' cy='8.45' r='0.55' />
          <circle cx='9.4' cy='8.45' r='0.55' />
          <circle cx='12.2' cy='8.45' r='0.55' />
          <circle cx='2.4' cy='10.55' r='0.55' />
          <circle cx='5.2' cy='10.55' r='0.55' />
          <circle cx='8' cy='10.55' r='0.55' />
          <circle cx='10.8' cy='10.55' r='0.55' />
          <circle cx='13.6' cy='10.55' r='0.55' />
          <circle cx='3.8' cy='12.65' r='0.55' />
          <circle cx='6.6' cy='12.65' r='0.55' />
          <circle cx='9.4' cy='12.65' r='0.55' />
          <circle cx='12.2' cy='12.65' r='0.55' />
          <circle cx='2.4' cy='14.75' r='0.55' />
          <circle cx='5.2' cy='14.75' r='0.55' />
          <circle cx='8' cy='14.75' r='0.55' />
          <circle cx='10.8' cy='14.75' r='0.55' />
          <circle cx='13.6' cy='14.75' r='0.55' />
        </g>
      </g>
    </svg>
  )
}

export function SwitzerlandFlagLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <circle cx='16' cy='16' r='16' fill='#D52B1E' />
      <path fill='#FFF' d='M13.8 7.5h4.4v6.3h6.3v4.4h-6.3v6.3h-4.4v-6.3H7.5v-4.4h6.3z' />
    </svg>
  )
}

export function BrazilFlagLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <defs>
        <clipPath id='br-flag-circle'>
          <circle cx='16' cy='16' r='16' />
        </clipPath>
      </defs>
      <g clipPath='url(#br-flag-circle)'>
        <path fill='#009B3A' d='M0 0h32v32H0z' />
        <path fill='#FFDF00' d='M16 5.25 29 16 16 26.75 3 16z' />
        <circle cx='16' cy='16' r='6.2' fill='#002776' />
        <path fill='#FFF' d='M9.95 14.15c4.92-.6 8.85.06 12.01 2.02l-.78 1.22c-2.85-1.76-6.47-2.35-11.06-1.79z' />
      </g>
    </svg>
  )
}

export function ChinaFlagLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <circle cx='16' cy='16' r='16' fill='#DE2910' />
      <g fill='#FFDE00'>
        <path d='m7.2 5.5 1.08 3.3h3.47l-2.8 2.04 1.07 3.3-2.82-2.04-2.8 2.04 1.07-3.3-2.82-2.04h3.48z' />
        <path d='m14.35 5.3.18 1.14 1.04-.51-.8.82.8.81-1.04-.5-.18 1.14-.18-1.14-1.04.5.8-.81-.8-.82 1.04.51z' />
        <path d='m17.1 8.2-.18 1.14 1.04.51-1.14.18-.18 1.14-.52-1.04-1.14.18.81-.82-.51-1.04 1.04.51z' />
        <path d='m17 12.15-.7.91 1.08.4-1.14.16-.05 1.15-.69-.92-1.1.32.66-.94-.65-.95 1.1.33.7-.92.04 1.15z' />
        <path d='m14.25 15.35.18 1.14 1.04-.51-.8.82.8.81-1.04-.5-.18 1.14-.18-1.14-1.04.5.8-.81-.8-.82 1.04.51z' />
      </g>
    </svg>
  )
}

export function EuropeanUnionFlagLogo() {
  const stars = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * Math.PI) / 6 - Math.PI / 2
    const x = 16 + Math.cos(angle) * 7
    const y = 16 + Math.sin(angle) * 7
    return <circle key={index} cx={x} cy={y} r='0.9' />
  })

  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <circle cx='16' cy='16' r='16' fill='#003399' />
      <g fill='#FFCC00'>{stars}</g>
    </svg>
  )
}

export function JapanFlagLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <circle cx='16' cy='16' r='16' fill='#FFF' />
      <circle cx='16' cy='16' r='7.3' fill='#BC002D' />
    </svg>
  )
}

export function UnitedKingdomFlagLogo() {
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <defs>
        <clipPath id='gb-flag-circle'>
          <circle cx='16' cy='16' r='16' />
        </clipPath>
      </defs>
      <g clipPath='url(#gb-flag-circle)'>
        <path fill='#012169' d='M0 0h32v32H0z' />
        <path stroke='#FFF' strokeWidth='6.4' d='m0 0 32 32M32 0 0 32' />
        <path stroke='#C8102E' strokeWidth='3.8' d='m0 0 32 32M32 0 0 32' />
        <path fill='#FFF' d='M13.2 0h5.6v32h-5.6zM0 13.2h32v5.6H0z' />
        <path fill='#C8102E' d='M14.4 0h3.2v32h-3.2zM0 14.4h32v3.2H0z' />
      </g>
    </svg>
  )
}
