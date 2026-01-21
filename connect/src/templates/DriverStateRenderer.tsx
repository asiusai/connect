import { useMemo } from 'react'
import { DriverStateV2 } from '../../../shared/log-reader/reader'

// Constants
const BTN_SIZE = 192
const ARC_LENGTH = 133
const ARC_THICKNESS_DEFAULT = 6.7
const ARC_THICKNESS_EXTEND = 12.0

const SCALES_POS = [0.9, 0.4, 0.4]
const SCALES_NEG = [0.7, 0.4, 0.4]

const ARC_POINT_COUNT = 37
const ARC_ANGLES = Array.from({ length: ARC_POINT_COUNT }, (_, i) => (i * Math.PI) / (ARC_POINT_COUNT - 1))

// Default 3D coordinates for face keypoints
const DEFAULT_FACE_KPTS_3D = [
  [-5.98, -51.2, 8.0],
  [-17.64, -49.14, 8.0],
  [-23.81, -46.4, 8.0],
  [-29.98, -40.91, 8.0],
  [-32.04, -37.49, 8.0],
  [-34.1, -32.0, 8.0],
  [-36.16, -21.03, 8.0],
  [-36.16, 6.4, 8.0],
  [-35.47, 10.51, 8.0],
  [-32.73, 19.43, 8.0],
  [-29.3, 26.29, 8.0],
  [-24.5, 33.83, 8.0],
  [-19.01, 41.37, 8.0],
  [-14.21, 46.17, 8.0],
  [-12.16, 47.54, 8.0],
  [-4.61, 49.6, 8.0],
  [4.99, 49.6, 8.0],
  [12.53, 47.54, 8.0],
  [14.59, 46.17, 8.0],
  [19.39, 41.37, 8.0],
  [24.87, 33.83, 8.0],
  [29.67, 26.29, 8.0],
  [33.1, 19.43, 8.0],
  [35.84, 10.51, 8.0],
  [36.53, 6.4, 8.0],
  [36.53, -21.03, 8.0],
  [34.47, -32.0, 8.0],
  [32.42, -37.49, 8.0],
  [30.36, -40.91, 8.0],
  [24.19, -46.4, 8.0],
  [18.02, -49.14, 8.0],
  [6.36, -51.2, 8.0],
  [-5.98, -51.2, 8.0],
]

type Props = {
  state: DriverStateV2
  isEngaged: boolean
}

export const DriverStateRenderer = ({ state, isEngaged }: Props) => {
  const isActive = state.FaceProb > 0.4
  // We don't have isRHD in FrameData yet, assume false or add it later.
  // For now, let's assume standard LHD or just use the data we have.
  // The python code uses isRHD to select left/right driver data, but we already have the selected data in `driverState`.

  // Math implementation
  const { facePath, hArc, vArc } = useMemo<{
    facePath: string
    hArc: { path: string | null; thickness: number | undefined }
    vArc: { path: string | null; thickness: number | undefined }
  }>(() => {
    // 1. Update pose values (Smoothing omitted for now as we are frame-based,
    // but we could implement a simple version if we had previous state.
    // For now, use raw values or maybe a simple dampening if we can).
    // The python code does: 0.8 * v_this + 0.2 * self.driver_pose_vals
    // We will use raw values for "v_this" as the "current" pose.

    const driver_orient = state.FaceOrientation // [pitch, roll, yaw] ? No, check capnp or python code.
    // Python code: driver_orient = driver_data.faceOrientation
    // Capnp: faceOrientation is List<float32>
    // Python code uses it as a vector of 3.

    // Scales
    const scales = driver_orient.map((val, i) => (val < 0 ? SCALES_NEG[i] : SCALES_POS[i]))
    const v_this = driver_orient.map((val, i) => val * scales[i])

    // We'll use v_this directly as "driver_pose_vals" for this frame.
    // If smoothing is critical, we'd need to pass previous state or use a ref, but let's try direct first.
    const driver_pose_vals = v_this

    // driver_pose_diff (used for arc thickness)
    // In python: self.driver_pose_diff = np.abs(self.driver_pose_vals - v_this)
    // Since we set them equal, diff is 0. This means arcs will be default thickness.
    // To get a diff, we'd need the previous frame's smoothed value.
    // Let's assume diff is 0 for now or simulate it?
    // Actually, diff is used for `ARC_THICKNESS_EXTEND * min(1.0, diff_val * 5.0)`.
    // If diff is 0, thickness is default. That's fine.
    const driver_pose_diff = [0, 0, 0]

    // Rotation matrix
    // Python: rotation_amount = self.driver_pose_vals * (1.0 - self.dm_fade_state)
    // We assume dm_fade_state is 0 (active) for now if active.
    // If we want the fade effect, we need state. Let's stick to active=0, inactive=0.5 (faded).
    const current_fade = isActive ? 0.0 : 0.5

    const rotation_amount = driver_pose_vals.map((v) => v * (1.0 - current_fade))
    const [sin_y, sin_x, sin_z] = rotation_amount.map(Math.sin)
    const [cos_y, cos_x, cos_z] = rotation_amount.map(Math.cos)

    // r_xyz matrix
    // [cos_x * cos_z, cos_x * sin_z, -sin_x],
    // [-sin_y * sin_x * cos_z - cos_y * sin_z, -sin_y * sin_x * sin_z + cos_y * cos_z, -sin_y * cos_x],
    // [cos_y * sin_x * cos_z - sin_y * sin_z, cos_y * sin_x * sin_z + sin_y * cos_z, cos_y * cos_x],

    const r00 = cos_x * cos_z
    const r01 = cos_x * sin_z
    const r02 = -sin_x
    const r10 = -sin_y * sin_x * cos_z - cos_y * sin_z
    const r11 = -sin_y * sin_x * sin_z + cos_y * cos_z
    const r12 = -sin_y * cos_x
    const r20 = cos_y * sin_x * cos_z - sin_y * sin_z
    const r21 = cos_y * sin_x * sin_z + sin_y * cos_z
    const r22 = cos_y * cos_x

    // Transform keypoints
    // face_kpts_draw = DEFAULT_FACE_KPTS_3D @ r_xyz.T
    // This means for each point p: p * r_xyz.T  =>  p . row_of_r_xyz
    // So new_x = p.x * r00 + p.y * r01 + p.z * r02

    const face_kpts_draw = DEFAULT_FACE_KPTS_3D.map(([x, y, z]) => {
      const nx = x * r00 + y * r01 + z * r02
      const ny = x * r10 + y * r11 + z * r12
      const nz = x * r20 + y * r21 + z * r22
      return [nx, ny, nz]
    })

    // Depth and projection
    // face_kpts_draw[:, 2] = self.face_kpts_draw[:, 2] * (1.0 - self.dm_fade_state) + 8 * self.dm_fade_state
    const kpts_z_adjusted = face_kpts_draw.map((p) => [p[0], p[1], p[2] * (1.0 - current_fade) + 8 * current_fade])

    // kp_depth = (self.face_kpts_draw[:, 2] - 8) / 120.0 + 1.0
    // face_keypoints_transformed = self.face_kpts_draw[:, :2] * kp_depth[:, None]
    const transformed_kpts = kpts_z_adjusted.map(([x, y, z]) => {
      const depth = (z - 8) / 120.0 + 1.0
      return [x * depth, y * depth]
    })

    // Generate SVG path for face
    // The points are in a specific order that forms a loop?
    // Python code: rl.draw_spline_linear(self.face_lines, ...)
    // Spline linear is just connecting points.
    // The last point in DEFAULT is same as first?
    // [-5.98, -51.20, 8.00] is first and last. Yes, it's a loop.

    // We need to map these to screen coordinates.
    // Python: self.position_x = self._rect.x + (width - offset if self.is_rhd else offset)
    // We'll position it at (0,0) of the component and let the parent position the component.
    // But the points are centered around 0?
    // DEFAULT points are around 0.
    // So we just add an offset to center it in the SVG.
    const centerOffset = BTN_SIZE / 2

    const pathData = 'M ' + transformed_kpts.map(([x, y]) => `${(x + centerOffset).toFixed(1)} ${(y + centerOffset).toFixed(1)}`).join(' L ')

    // Arcs
    // delta_x = -self.driver_pose_sins[1] * ARC_LENGTH / 2.0
    // delta_y = -self.driver_pose_sins[0] * ARC_LENGTH / 2.0
    const delta_x = (-sin_x * ARC_LENGTH) / 2.0
    const delta_y = (-sin_y * ARC_LENGTH) / 2.0

    // Helper for arc
    const calculateArc = (delta: number, size: number, x: number, y: number, sin_val: number, diff_val: number, is_horizontal: boolean) => {
      if (size <= 0) return null

      const thickness = ARC_THICKNESS_DEFAULT + ARC_THICKNESS_EXTEND * Math.min(1.0, diff_val * 5.0)
      // Wait, python: start_angle = (90 if sin_val > 0 else -90) if is_horizontal else (0 if sin_val > 0 else 180)
      const real_start_angle = is_horizontal ? (sin_val > 0 ? 90 : -90) : sin_val > 0 ? 0 : 180

      const adjusted_x = is_horizontal ? Math.min(x + delta, x) : x
      const adjusted_y = is_horizontal ? y : Math.min(y + delta, y)

      const width = is_horizontal ? size : ARC_LENGTH
      const height = is_horizontal ? ARC_LENGTH : size

      const center_x = adjusted_x + width / 2
      const center_y = adjusted_y + height / 2
      const radius_x = width / 2
      const radius_y = height / 2

      // Generate points
      const points = ARC_ANGLES.map((angle) => {
        const theta = angle + (real_start_angle * Math.PI) / 180
        const px = center_x + Math.cos(theta) * radius_x
        const py = center_y - Math.sin(theta) * radius_y
        return [px, py]
      })

      return { points, thickness }
    }

    // H Arc
    const h_width = Math.abs(delta_x)
    // Python: self.position_x, self.position_y - ARC_LENGTH / 2
    // Our position_x/y is centerOffset
    const hArcData = calculateArc(delta_x, h_width, centerOffset, centerOffset - ARC_LENGTH / 2, sin_x, driver_pose_diff[1], true)

    // V Arc
    const v_height = Math.abs(delta_y)
    const vArcData = calculateArc(delta_y, v_height, centerOffset - ARC_LENGTH / 2, centerOffset, sin_y, driver_pose_diff[0], false)

    const hArcPath = hArcData ? 'M ' + hArcData.points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ') : null
    const vArcPath = vArcData ? 'M ' + vArcData.points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ') : null

    return {
      facePath: pathData,
      hArc: { path: hArcPath, thickness: hArcData?.thickness },
      vArc: { path: vArcPath, thickness: vArcData?.thickness },
    }
  }, [state.FaceOrientation, isActive]) // faceOrientation changes every frame

  const opacity = isActive ? 0.65 : 0.2
  const arcColor = isEngaged ? '#1af242' : '#8b8b8b'
  const arcOpacity = 0.4 * (isActive ? 1.0 : 0.5) // Simplified fade

  return (
    <div style={{ width: BTN_SIZE, height: BTN_SIZE, position: 'relative' }}>
      {/* Background Circle */}
      <div className="absolute inset-0 rounded-full bg-black/30" style={{ width: BTN_SIZE, height: BTN_SIZE }} />

      {/* <img src="/driver_face.png" ... /> */}

      <svg width={BTN_SIZE} height={BTN_SIZE} style={{ overflow: 'visible' }}>
        {/* Face Outline */}
        <path d={facePath} stroke={`rgba(255, 255, 255, ${opacity})`} strokeWidth={5.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Arcs */}
        {hArc.path && <path d={hArc.path} stroke={arcColor} strokeWidth={hArc.thickness} fill="none" strokeOpacity={arcOpacity} strokeLinecap="round" />}
        {vArc.path && <path d={vArc.path} stroke={arcColor} strokeWidth={vArc.thickness} fill="none" strokeOpacity={arcOpacity} strokeLinecap="round" />}
      </svg>
    </div>
  )
}
