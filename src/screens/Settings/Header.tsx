import MainHeader from '../../components/Header'
import { useContext } from 'react'
import { OptionsContext } from '../../providers/options'

interface HeaderProps {
  auxIcon?: JSX.Element
  auxFunc?: () => void
  auxText?: string
  backFunc?: () => void
  back?: boolean
  text: string
}

export default function Header({ auxIcon, auxFunc, auxText, backFunc, back, text }: HeaderProps) {
  const { goBack } = useContext(OptionsContext)

  return (
    <MainHeader
      auxIcon={auxIcon}
      auxFunc={auxFunc}
      auxText={auxText}
      back={backFunc ? backFunc : back ? goBack : undefined}
      text={text}
    />
  )
}
