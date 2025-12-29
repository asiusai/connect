export const WIDTH = 1928
export const HEIGHT = 1208
export const FPS = 20

export const toFrames = (seconds: number) => Math.round(seconds * FPS)
export const toSeconds = (frames: number) => frames / FPS
