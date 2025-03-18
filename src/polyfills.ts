import { Buffer } from 'buffer'
import process from 'process/browser'

window.Buffer = Buffer
globalThis.Buffer = Buffer

globalThis.process = process
window.process = process
