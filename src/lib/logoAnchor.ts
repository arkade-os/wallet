// Module-level ref registry for the Wallet screen's LogoIcon position.
// LoadingLogo reads this to calculate the fly-to-target exit animation destination.

let logoAnchorEl: HTMLDivElement | null = null

export function setLogoAnchor(el: HTMLDivElement | null) {
  logoAnchorEl = el
}

export function getLogoAnchor() {
  return logoAnchorEl
}
