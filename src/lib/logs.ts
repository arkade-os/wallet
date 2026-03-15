import { extractError } from './error'

enum LogLevel {
  Log = 'log',
  Error = 'error',
}

export type LogLine = {
  msg: string
  time: string
  level: string
}

const itemName = 'logs'
const MAX_LOGS = 200 // around 250 bytes per log * 200 = 50KB at most

export const getLogs = (): LogLine[] => {
  const logs = localStorage.getItem(itemName)
  return JSON.parse(logs ?? '[]') as LogLine[]
}

export const getInfoLogs = (): LogLine[] => getLogs().filter((l) => l.level === 'info')

export const clearLogs = () => localStorage.removeItem(itemName)

const addLog = (level: LogLevel, args: string[]) => {
  const logs = getLogs()
  logs.push({
    level,
    msg: args.join(' '),
    time: new Date().toString(),
  })

  // Remove oldest logs if we exceed the limit
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS)
  }

  localStorage.setItem(itemName, JSON.stringify(logs))
}

export const consoleLog = (...args: any[]) => {
  addLog(LogLevel.Log, args)
  console.log(...args)
}

export const consoleError = (err: any, msg = '') => {
  const str = (msg ? `${msg}: ` : '') + extractError(err)
  addLog(LogLevel.Error, [str])
  console.error(str)
}

export const getInfoLogsLength = () => getInfoLogs().length

export const getInfoLogLineMsg = (index: number) => getInfoLogs()[index].msg
