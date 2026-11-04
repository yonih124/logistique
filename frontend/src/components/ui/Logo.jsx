import { useEffect, useRef } from 'react'
import optiStockLogo from '@/assets/brand/OptiStock.png'

export function Logo({ light = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const image = new Image()
    image.src = optiStockLogo
    image.onload = () => {
      const source = document.createElement('canvas')
      source.width = image.naturalWidth
      source.height = image.naturalHeight
      const context = source.getContext('2d', { willReadFrequently: true })
      context.drawImage(image, 0, 0)
      const frame = context.getImageData(0, 0, source.width, source.height)
      const pixels = frame.data
      const width = source.width
      const height = source.height
      const visited = new Uint8Array(width * height)
      const queue = new Int32Array(width * height)
      let head = 0
      let tail = 0
      const enqueue = index => {
        if (visited[index]) return
        const offset = index * 4
        if (pixels[offset] < 242 || pixels[offset + 1] < 242 || pixels[offset + 2] < 242) return
        visited[index] = 1
        queue[tail++] = index
      }
      for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x) }
      for (let y = 0; y < height; y += 1) { enqueue(y * width); enqueue(y * width + width - 1) }
      while (head < tail) {
        const index = queue[head++]
        pixels[index * 4 + 3] = 0
        const x = index % width
        const y = Math.floor(index / width)
        if (x > 0) enqueue(index - 1)
        if (x < width - 1) enqueue(index + 1)
        if (y > 0) enqueue(index - width)
        if (y < height - 1) enqueue(index + width)
      }
      context.putImageData(frame, 0, 0)
      let minX = width; let minY = height; let maxX = 0; let maxY = 0
      for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
        if (pixels[(y * width + x) * 4 + 3] > 10) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y) }
      }
      const padding = 8
      minX = Math.max(0, minX - padding); minY = Math.max(0, minY - padding)
      maxX = Math.min(width - 1, maxX + padding); maxY = Math.min(height - 1, maxY + padding)
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = maxX - minX + 1
      canvas.height = maxY - minY + 1
      canvas.getContext('2d').drawImage(source, minX, minY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
    }
  }, [])

  return <div className={`brand official-brand ${light ? 'light' : ''}`}><canvas ref={canvasRef} className="official-logo-canvas" role="img" aria-label="OptiStock — Direction de la Solde et des Pensions" /></div>
}

export function TransparentLogo({ light = false }) {
  return <div className={`brand official-brand ${light ? 'light' : ''}`}><img className="official-transparent-logo" src={optiStockLogo} alt="OptiStock — Direction de la Solde et des Pensions" /></div>
}
