import { z } from 'zod'

export const Skill = z.object({
  skill_type: z.literal('can_msg'),
  name: z.string(),
  description: z.string(),
  bus: z.number(),
  msg_id: z.number(),
  count: z.number(),
  data: z.string(),
})
export type Skill = z.infer<typeof Skill>

export const SkillExtended = Skill.extend({
  platforms: z.string().array(),
})
export type SkillExtended = z.infer<typeof SkillExtended>

export const skills: SkillExtended[] = [
  // Storage
  { skill_type: 'can_msg', name: 'Frunk', description: 'Open frunk', bus: 1, msg_id: 0x273, count: 10, data: '2000000000000000', platforms: ['TESLA_MODEL_3'] },
  { skill_type: 'can_msg', name: 'Trunk', description: 'Open trunk', bus: 1, msg_id: 0x3b3, count: 10, data: '0200000000000000', platforms: ['TESLA_MODEL_3'] },
  {
    skill_type: 'can_msg',
    name: 'Glovebox',
    description: 'Open glovebox',
    bus: 1,
    msg_id: 0x3b3,
    count: 10,
    data: '0100000000000000',
    platforms: ['TESLA_MODEL_3'],
  },

  // Charge port
  {
    skill_type: 'can_msg',
    name: 'Charge Port Open',
    description: 'Open charge port door',
    bus: 1,
    msg_id: 0x333,
    count: 10,
    data: '0100000000000000',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Charge Port Close',
    description: 'Close charge port door',
    bus: 1,
    msg_id: 0x333,
    count: 10,
    data: '0200000000000000',
    platforms: ['TESLA_MODEL_3'],
  },

  // Mirrors
  {
    skill_type: 'can_msg',
    name: 'Fold Mirrors',
    description: 'Fold side mirrors',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0000000100000000',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Unfold Mirrors',
    description: 'Unfold side mirrors',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0000000200000000',
    platforms: ['TESLA_MODEL_3'],
  },

  // Horn
  { skill_type: 'can_msg', name: 'Honk', description: 'Honk horn', bus: 1, msg_id: 0x273, count: 5, data: '0000000000000020', platforms: ['TESLA_MODEL_3'] },

  // Lock/Unlock
  { skill_type: 'can_msg', name: 'Lock', description: 'Lock car', bus: 1, msg_id: 0x273, count: 10, data: '0000020000000000', platforms: ['TESLA_MODEL_3'] },
  {
    skill_type: 'can_msg',
    name: 'Unlock',
    description: 'Unlock car',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0000040000000000',
    platforms: ['TESLA_MODEL_3'],
  },

  // Lights
  {
    skill_type: 'can_msg',
    name: 'Lights Off',
    description: 'Turn lights off',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0600000000000000',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Lights On',
    description: 'Turn lights on',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0200000000000000',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Lights Parking',
    description: 'Turn parking lights on',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0400000000000000',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Lights Auto',
    description: 'Set lights to auto',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0000000000000000',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Dome Light On',
    description: 'Turn dome light on',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0000000000000008',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Dome Light Off',
    description: 'Turn dome light off',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0000000000000000',
    platforms: ['TESLA_MODEL_3'],
  },

  // Seat heaters (level 3 = HIGH)
  {
    skill_type: 'can_msg',
    name: 'Seat Heat FL',
    description: 'Front left seat heater HIGH',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '000000000c000000',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Seat Heat FR',
    description: 'Front right seat heater HIGH',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0000000000300000',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Seat Heat RL',
    description: 'Rear left seat heater HIGH',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '00000000c0000000',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Seat Heat RR',
    description: 'Rear right seat heater HIGH',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0000000000000300',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Seat Heat Off',
    description: 'Turn off all seat heaters',
    bus: 1,
    msg_id: 0x273,
    count: 10,
    data: '0000000000000000',
    platforms: ['TESLA_MODEL_3'],
  },

  // Windows
  {
    skill_type: 'can_msg',
    name: 'Vent Windows',
    description: 'Vent all windows',
    bus: 1,
    msg_id: 0x3b3,
    count: 10,
    data: '0000100000000000',
    platforms: ['TESLA_MODEL_3'],
  },
  {
    skill_type: 'can_msg',
    name: 'Close Windows',
    description: 'Close all windows',
    bus: 1,
    msg_id: 0x3b3,
    count: 10,
    data: '0000200000000000',
    platforms: ['TESLA_MODEL_3'],
  },
]
