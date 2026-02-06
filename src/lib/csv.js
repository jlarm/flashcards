export function parseCsv(text) {
  const rows = []
  let current = ''
  let inQuotes = false
  const row = []

  function pushCell() {
    row.push(current)
    current = ''
  }

  function pushRow() {
    if (row.length || current.length) {
      pushCell()
      rows.push(row.splice(0, row.length))
    }
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      pushCell()
      continue
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      pushRow()
      continue
    }
    current += char
  }
  if (current.length || row.length) {
    pushRow()
  }

  return rows.map((cells) => cells.map((cell) => cell.trim()))
}

export function normalizeCardRows(rows) {
  if (!rows.length) return []
  const header = rows[0].map((value) => value.toLowerCase())
  const hasHeader = header.includes('front') || header.includes('back')
  const dataRows = hasHeader ? rows.slice(1) : rows

  return dataRows
    .map((cells) => {
      if (hasHeader) {
        const map = Object.fromEntries(header.map((key, index) => [key, cells[index] ?? '']))
        return {
          front: map.front ?? '',
          back: map.back ?? '',
          hint: map.hint || null,
          extra: map.extra ? safeJson(map.extra) : null,
        }
      }
      return {
        front: cells[0] ?? '',
        back: cells[1] ?? '',
        hint: cells[2] || null,
        extra: cells[3] ? safeJson(cells[3]) : null,
      }
    })
    .filter((row) => row.front && row.back)
}

function safeJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return { note: value }
  }
}
