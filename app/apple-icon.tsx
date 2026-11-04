import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/** iOS will not take an SVG home-screen icon, so the same mark is rasterised here. */
export default async function AppleIcon() {
  const svg = await readFile(join(process.cwd(), 'public/icon.svg'))
  const src = `data:image/svg+xml;base64,${svg.toString('base64')}`
  // eslint-disable-next-line @next/next/no-img-element
  return new ImageResponse(<img src={src} width={180} height={180} alt="" />, size)
}
