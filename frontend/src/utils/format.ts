export function formatTime(timeText?: string | null): string {
  if (!timeText) {
    return ''
  }

  const date = new Date(timeText)
  if (Number.isNaN(date.getTime())) {
    return timeText
  }

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${month}-${day} ${hour}:${minute}`
}

export function formatScore(value?: number | null): string {
  if (value === undefined || value === null) {
    return '未知'
  }
  return Number(value).toFixed(4)
}

let sequence = 0

export function createMessageId(): string {
  sequence += 1
  return `msg_${Date.now()}_${sequence}`
}
