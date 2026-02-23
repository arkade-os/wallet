import { ReactNode } from 'react'
import CenterScreen from './CenterScreen'
import FlexCol from './FlexCol'
import Text, { TextSecondary } from './Text'

interface EmptyProps {
  text: string
  icon?: ReactNode
  secondaryText?: string
}

function EmptyTemplate({ icon, text, secondaryText }: EmptyProps) {
  return (
    <CenterScreen>
      <FlexCol centered gap='1rem'>
        {icon}
        <FlexCol centered gap='0.5rem'>
          <Text heading>{text}</Text>
          <TextSecondary>{secondaryText}</TextSecondary>
        </FlexCol>
      </FlexCol>
    </CenterScreen>
  )
}

export function EmptyCoinsList() {
  return (
    <EmptyTemplate
      icon={<EmptyCoinsIcon />}
      text='No virtual coins available'
      secondaryText='Generate or import coins to continue'
    />
  )
}

export function EmptyLogsList() {
  return (
    <EmptyTemplate
      icon={<EmptyListIcon />}
      text='No logs available'
      secondaryText='Start using the app to generate logs.'
    />
  )
}

export function EmptySwapList() {
  return (
    <EmptyTemplate
      icon={<EmptySwapListIcon />}
      text='No swaps yet'
      secondaryText='Your swap history will appear here once you start swapping.'
    />
  )
}

export function EmptyTxList() {
  return (
    <EmptyTemplate
      icon={<EmptyListIcon />}
      text='No transactions yet'
      secondaryText='Make a transaction to get started.'
    />
  )
}

function EmptyCoinsIcon() {
  return (
    <svg width='57' height='56' viewBox='0 0 57 56' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M15.2 5H42.8V9.6H15.2V5ZM10.6 14.2V9.6H15.2V14.2H10.6ZM10.6 41.8V14.2H6V41.8H10.6ZM15.2 46.4V41.8H10.6V46.4H15.2ZM42.8 46.4V51H15.2V46.4H42.8ZM47.4 41.8V46.4H42.8V41.8H47.4ZM47.4 14.2H52V41.8H47.4V14.2ZM47.4 14.2V9.6H42.8V14.2H47.4Z'
        fill='var(--dark20)'
      />
      <path
        d='M18.0703 16.0996H21.1917V19.221H18.0703V16.0996ZM24.3132 22.3425H21.1917V19.221H24.3132V22.3425ZM27.4346 25.4639H24.3132V22.3425H27.4346V25.4639ZM30.556 25.4639H27.4346V28.5853H24.3132V31.7068H21.1917V34.8282H18.0703V37.9496H21.1917V34.8282H24.3132V31.7068H27.4346V28.5853H30.556V31.7068H33.6775V34.8282H36.7989V37.9496H39.9203V34.8282H36.7989V31.7068H33.6775V28.5853H30.556V25.4639ZM33.6775 22.3425V25.4639H30.556V22.3425H33.6775ZM36.7989 19.221V22.3425H33.6775V19.221H36.7989ZM36.7989 19.221V16.0996H39.9203V19.221H36.7989Z'
        fill='var(--dark20)'
      />
    </svg>
  )
}

function EmptyListIcon() {
  return (
    <svg width='57' height='56' viewBox='0 0 57 56' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M5.16797 25.667V11.667H19.168V25.667H5.16797ZM14.5013 21.0003V16.3337H9.83464V21.0003H14.5013ZM51.8346 11.667H23.8346V16.3337H51.8346V11.667ZM51.8346 21.0003H23.8346V25.667H51.8346V21.0003ZM23.8346 30.3337H51.8346V35.0003H23.8346V30.3337ZM51.8346 39.667H23.8346V44.3337H51.8346V39.667ZM5.16797 30.3337V44.3337H19.168V30.3337H5.16797ZM14.5013 35.0003V39.667H9.83464V35.0003H14.5013Z'
        fill='var(--dark30)'
      />
    </svg>
  )
}

function EmptySwapListIcon() {
  return (
    <svg width='57' height='56' viewBox='0 0 57 56' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M9.83203 21V16.3333H37.832V11.6667H42.4987V16.3333H47.1654V21H42.4987V25.6667H37.832V21H9.83203ZM37.832 25.6667H33.1654V30.3333H37.832V25.6667ZM37.832 11.6667H33.1654V7H37.832V11.6667ZM47.1654 39.6667V35H19.1654V30.3333H23.832V25.6667H19.1654V30.3333H14.4987V35H9.83203V39.6667H14.4987V44.3333H19.1654V49H23.832V44.3333H19.1654V39.6667H47.1654Z'
        fill='var(--dark30)'
      />
    </svg>
  )
}
