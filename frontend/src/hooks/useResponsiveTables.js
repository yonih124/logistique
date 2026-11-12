import { useEffect } from 'react'

function labelCells(root) {
  for (const table of root.querySelectorAll('.table-scroll table')) {
    const headers = [...table.querySelectorAll('thead th')].map(cell => cell.textContent.trim())
    for (const row of table.querySelectorAll('tbody tr')) {
      let column = 0
      for (const cell of row.cells) {
        const label = headers[column] ?? ''
        if (cell.dataset.label !== label) cell.dataset.label = label
        column += cell.colSpan
      }
    }
  }
}

/**
 * Recopie l'en-tête de colonne sur chaque cellule (`data-label`) : quand la place
 * manque, enhancements.css affiche les lignes en cartes et rappelle ce libellé.
 */
export function useResponsiveTables(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let frame = 0
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; labelCells(root) })
    }
    const observer = new MutationObserver(schedule)
    observer.observe(root, { childList: true, subtree: true })
    schedule()
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [rootRef])
}
