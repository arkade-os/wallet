export default function Modal({ children }: { children: React.ReactNode }) {
  const outerStyle = {
    top: '0',
    left: '0',
    zIndex: 21,
    opacity: 0.95,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute' as 'absolute',
    backgroundColor: 'var(--ion-background-color)',
  }
  const innerStyle = {
    zIndex: 21,
    opacity: 1,
    padding: '1rem',
    maxWidth: 'min(22rem, 90%)',
    borderRadius: '0.5rem',
    border: '1px solid rgba(251, 251, 251, 0.10)',
    backgroundColor: 'var(--ion-background-color)',
  }
  return (
    <>
      <div style={outerStyle}>
        <div style={innerStyle}>{children}</div>
      </div>
    </>
  )
}
