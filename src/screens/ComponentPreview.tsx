import { useState } from 'react'
import Button from '../components/Button'
import Toggle from '../components/Toggle'
import Checkbox from '../components/Checkbox'
import Input from '../components/Input'
import InputPassword from '../components/InputPassword'
import Header from '../components/Header'
import Content from '../components/Content'
import ButtonsOnBottom from '../components/ButtonsOnBottom'
import Text, { TextLabel, TextSecondary } from '../components/Text'
import FlexCol from '../components/FlexCol'
import FlexRow from '../components/FlexRow'
import SheetModal from '../components/SheetModal'
import Modal from '../components/Modal'
import Shadow from '../components/Shadow'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <FlexCol gap='0.75rem'>
      <Text heading big bold>
        {title}
      </Text>
      <div style={{ border: '1px dashed var(--dark20)', borderRadius: '0.5rem', padding: '1rem' }}>{children}</div>
    </FlexCol>
  )
}

function ColorSwatch({ name, cssVar }: { name: string; cssVar: string }) {
  return (
    <FlexRow gap='0.5rem'>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          background: `var(${cssVar})`,
          border: '1px solid var(--dark20)',
          flexShrink: 0,
        }}
      />
      <FlexCol gap='0'>
        <Text small bold>
          {name}
        </Text>
        <Text tiny color='dark50'>
          {cssVar}
        </Text>
      </FlexCol>
    </FlexRow>
  )
}

export default function ComponentPreview() {
  const [toggle1, setToggle1] = useState(false)
  const [toggle2, setToggle2] = useState(true)
  const [inputVal, setInputVal] = useState('')
  const [passVal, setPassVal] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <Header text='Component preview' back />
      <Content>
        <div style={{ padding: '0 1rem' }}>
          <FlexCol gap='2rem'>
            {/* ==================== COLORS ==================== */}
            <Section title='Purple ramp'>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <ColorSwatch name='Purple 50' cssVar='--purple-50' />
                <ColorSwatch name='Purple 100' cssVar='--purple-100' />
                <ColorSwatch name='Purple 200' cssVar='--purple-200' />
                <ColorSwatch name='Purple 300' cssVar='--purple-300' />
                <ColorSwatch name='Purple 400' cssVar='--purple-400' />
                <ColorSwatch name='Purple 500' cssVar='--purple-500' />
                <ColorSwatch name='Purple 600' cssVar='--purple-600' />
                <ColorSwatch name='Purple 700 (brand)' cssVar='--purple-700' />
                <ColorSwatch name='Purple 800' cssVar='--purple-800' />
                <ColorSwatch name='Purple 900' cssVar='--purple-900' />
                <ColorSwatch name='Purple 950' cssVar='--purple-950' />
              </div>
            </Section>

            <Section title='Semantic colors'>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <ColorSwatch name='Background' cssVar='--bg' />
                <ColorSwatch name='Foreground' cssVar='--fg' />
                <ColorSwatch name='Green' cssVar='--green' />
                <ColorSwatch name='Red' cssVar='--red' />
                <ColorSwatch name='Orange' cssVar='--orange' />
                <ColorSwatch name='Yellow' cssVar='--yellow' />
                <ColorSwatch name='Grey' cssVar='--grey' />
              </div>
            </Section>

            <Section title='Opacity scale'>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <ColorSwatch name='Dark 05' cssVar='--dark05' />
                <ColorSwatch name='Dark 10' cssVar='--dark10' />
                <ColorSwatch name='Dark 15' cssVar='--dark15' />
                <ColorSwatch name='Dark 20' cssVar='--dark20' />
                <ColorSwatch name='Dark 30' cssVar='--dark30' />
                <ColorSwatch name='Dark 50' cssVar='--dark50' />
                <ColorSwatch name='Dark 70' cssVar='--dark70' />
                <ColorSwatch name='Dark 80' cssVar='--dark80' />
              </div>
            </Section>

            {/* ==================== TYPOGRAPHY ==================== */}
            <Section title='Typography'>
              <FlexCol gap='0.5rem'>
                <Text heading bigger bold>
                  Heading bigger bold
                </Text>
                <Text heading big bold>
                  Heading big bold
                </Text>
                <Text heading large medium>
                  Heading large medium
                </Text>
                <Text heading medium>
                  Heading default medium
                </Text>
                <Text>Body default (16px)</Text>
                <Text bold>Body bold</Text>
                <Text medium>Body medium</Text>
                <Text thin>Body thin</Text>
                <Text small>Small (14px)</Text>
                <Text smaller>Smaller (13px)</Text>
                <Text tiny>Tiny (12px)</Text>
                <TextLabel>Text label</TextLabel>
                <TextSecondary>Text secondary</TextSecondary>
                <Text color='purple'>Purple text</Text>
                <Text color='red'>Red text</Text>
                <Text color='green'>Green text</Text>
                <Text color='orange'>Orange text</Text>
              </FlexCol>
            </Section>

            {/* ==================== BUTTONS ==================== */}
            <Section title='Buttons'>
              <FlexCol gap='0.5rem'>
                <Button label='Default (purple)' onClick={() => {}} />
                <Button label='Destructive (red)' red onClick={() => {}} />
                <Button label='Secondary' secondary onClick={() => {}} />
                <Button label='Outline' outline onClick={() => {}} />
                <Button label='Clear / ghost' clear onClick={() => {}} />
                <Button label='Disabled' disabled onClick={() => {}} />
                <Button label='Loading' loading onClick={() => {}} />
                <FlexRow>
                  <Button label='Side by side' onClick={() => {}} />
                  <Button label='Two buttons' secondary onClick={() => {}} />
                </FlexRow>
              </FlexCol>
            </Section>

            {/* ==================== TOGGLE (shadcn Switch) ==================== */}
            <Section title='Toggle (shadcn Switch)'>
              <FlexCol gap='0.5rem'>
                <Toggle
                  checked={toggle1}
                  onClick={() => setToggle1(!toggle1)}
                  text='Unchecked toggle'
                  subtext='This is the subtext'
                />
                <Toggle checked={toggle2} onClick={() => setToggle2(!toggle2)} text='Checked toggle' />
              </FlexCol>
            </Section>

            {/* ==================== CHECKBOX (shadcn Checkbox) ==================== */}
            <Section title='Checkbox (shadcn Checkbox)'>
              <FlexCol gap='0.5rem'>
                <Checkbox onChange={() => {}} text='I agree to the terms and conditions' />
                <Checkbox onChange={() => {}} text='Enable notifications' />
              </FlexCol>
            </Section>

            {/* ==================== INPUTS (shadcn Input) ==================== */}
            <Section title='Inputs (shadcn Input)'>
              <FlexCol gap='0.75rem'>
                <Input label='Text input' placeholder='Enter something...' value={inputVal} onChange={setInputVal} />
                <Input
                  label='With right element'
                  placeholder='Amount'
                  right={
                    <Text small color='dark50'>
                      SATS
                    </Text>
                  }
                  value=''
                  onChange={() => {}}
                />
                <InputPassword
                  label='Password input'
                  placeholder='Enter password...'
                  onChange={(e: any) => setPassVal(e.target?.value ?? '')}
                />
              </FlexCol>
            </Section>

            {/* ==================== SHEET MODAL (shadcn Drawer) ==================== */}
            <Section title='Sheet modal (shadcn Drawer)'>
              <Button label='Open sheet modal' onClick={() => setSheetOpen(true)} />
              <SheetModal isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
                <FlexCol gap='1rem'>
                  <Text heading big bold>
                    Sheet modal title
                  </Text>
                  <TextSecondary>
                    This is the sheet modal content. It uses Vaul (shadcn Drawer) with drag-to-dismiss.
                  </TextSecondary>
                  <Button label='Close' secondary onClick={() => setSheetOpen(false)} />
                </FlexCol>
              </SheetModal>
            </Section>

            {/* ==================== DIALOG (shadcn Dialog) ==================== */}
            <Section title='Dialog (shadcn Dialog)'>
              <Button label='Open dialog' outline onClick={() => setModalOpen(true)} />
              {modalOpen ? (
                <Modal onClose={() => setModalOpen(false)}>
                  <FlexCol gap='1rem'>
                    <Text heading big bold>
                      Dialog title
                    </Text>
                    <TextSecondary>
                      This is the dialog content. It uses shadcn Dialog with focus trap and overlay.
                    </TextSecondary>
                    <FlexRow>
                      <Button label='Cancel' secondary onClick={() => setModalOpen(false)} />
                      <Button label='Confirm' onClick={() => setModalOpen(false)} />
                    </FlexRow>
                  </FlexCol>
                </Modal>
              ) : null}
            </Section>

            {/* ==================== TOAST (Sonner) ==================== */}
            <Section title='Toast (Sonner)'>
              <FlexCol gap='0.5rem'>
                <Text copy='test-clipboard-value'>Tap this text to trigger "Copied to clipboard" toast</Text>
                <TextSecondary>The toast appears at top-center, dark bg, centered text, 1.5s duration.</TextSecondary>
              </FlexCol>
            </Section>

            {/* ==================== MISC ==================== */}
            <Section title='Shadow / card'>
              <Shadow>
                <FlexCol gap='0.5rem'>
                  <Text bold>Shadow card</Text>
                  <TextSecondary>Content inside a Shadow wrapper</TextSecondary>
                </FlexCol>
              </Shadow>
            </Section>

            <Section title='Tailwind utility classes (verify working)'>
              <FlexCol gap='0.5rem'>
                <div className='bg-purple-700 text-white p-3 rounded-md text-sm'>
                  bg-purple-700 text-white p-3 rounded-md
                </div>
                <div className='bg-dark-10 p-3 rounded-md text-sm'>bg-dark-10 p-3 rounded-md</div>
                <div className='border border-border p-3 rounded-md text-sm'>border border-border p-3 rounded-md</div>
                <div className='text-muted text-sm'>text-muted (should be 50% opacity)</div>
                <div className='font-heading text-lg'>font-heading (TT Firs Neue)</div>
                <div className='font-mono text-sm'>font-mono (Geist Mono)</div>
              </FlexCol>
            </Section>

            <div style={{ height: '6rem' }} />
          </FlexCol>
        </div>
      </Content>
      <ButtonsOnBottom>
        <Button label='Footer button (ButtonsOnBottom)' onClick={() => {}} />
      </ButtonsOnBottom>
    </>
  )
}
