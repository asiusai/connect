/** @jsxImportSource react */

import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { z } from 'zod'

export const myCompSchema = z.object({
  title: z.string(),
})

export const HelloWorld = ({ title }: z.infer<typeof myCompSchema>) => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  return (
    <AbsoluteFill style={{ backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', fontSize: 50 }}>
      <p>{title.slice(0, 1 + title.length * (frame / durationInFrames))}</p>
    </AbsoluteFill>
  )
}
