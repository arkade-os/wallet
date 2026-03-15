import MainHeader from '../../components/Header'
import { useContext } from 'react'
import { OptionsContext } from '../../providers/options'

interface HeaderProps {
  auxFunc?: () => void
  auxText?: string
  backFunc?: () => void
  back?: boolean
  text: string
}

export default function Header({ auxFunc, auxText, backFunc, back, text }: HeaderProps) {
  const { goBack } = useContext(OptionsContext)

  return (
    <MainHeader
      auxFunc={auxFunc}
      auxText={auxText}
      back={backFunc ? backFunc : back ? goBack : undefined}
      heading={false}
      text={text}
    />
  )
}
