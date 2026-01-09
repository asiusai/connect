import { relations, InferSelectModel } from 'drizzle-orm'
import { integer, sqliteTable, text, real, primaryKey } from 'drizzle-orm/sqlite-core'
import { Permission } from '../../connect/src/types'

const createdAt = (name: string) =>
  integer(name)
    .$defaultFn(() => Date.now())
    .notNull()

export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  regdate: createdAt('regdate'),
  superuser: integer('superuser', { mode: 'boolean' }).notNull(),
  user_id: text('user_id').notNull(),
  username: text('username'),
})
export type UserData = InferSelectModel<typeof usersTable>

export const devicesTable = sqliteTable('devices', {
  dongle_id: text('dongle_id').primaryKey(),
  public_key: text('public_key').notNull().unique(),

  alias: text('alias'),
  device_type: text('device_type'),
  ignore_uploads: integer('ignore_uploads', { mode: 'boolean' }),
  openpilot_version: text('openpilot_version'),

  serial: text('serial').notNull(),
  imei: text('imei').notNull(),
  imei2: text('imei2').notNull(),

  create_time: createdAt('created_time'),
})
export type DeviceData = InferSelectModel<typeof devicesTable>

export const deviceUsersTable = sqliteTable(
  'device_users',
  {
    user_id: text('user_id').notNull(),
    dongle_id: text('dongle_id').notNull(),
    permission: text('permission').$type<Permission>().notNull(),

    create_time: createdAt('create_time'),
  },
  (x) => [primaryKey({ columns: [x.user_id, x.dongle_id] })],
)
export type DeviceUserData = InferSelectModel<typeof deviceUsersTable>

export const routesTable = sqliteTable(
  'route_settings',
  {
    dongle_id: text('dongle_id').notNull(),
    route_id: text('route_id').notNull(),
    is_public: integer('is_public', { mode: 'boolean' }).default(false).notNull(),
    is_preserved: integer('is_preserved', { mode: 'boolean' }).default(false).notNull(),
  },
  (x) => [primaryKey({ columns: [x.dongle_id, x.route_id] })],
)
export type RouteData = InferSelectModel<typeof routesTable>

export const segmentsTable = sqliteTable(
  'segments',
  {
    dongle_id: text('dongle_id').notNull(),
    route_id: text('route_id').notNull(), // e.g., 00000033--5a810099dc
    segment: integer('segment').notNull(),

    // Processed from qlog
    start_time: integer('start_time'), // unix ms
    end_time: integer('end_time'), // unix ms
    start_lat: real('start_lat'),
    start_lng: real('start_lng'),
    end_lat: real('end_lat'),
    end_lng: real('end_lng'),
    distance: real('distance'),

    // Metadata (from segment 0)
    version: text('version'),
    git_branch: text('git_branch'),
    git_commit: text('git_commit'),
    git_commit_date: text('git_commit_date'),
    git_dirty: integer('git_dirty', { mode: 'boolean' }),
    git_remote: text('git_remote'),
    platform: text('platform'), // car fingerprint e.g. TESLA_MODEL_3
    vin: text('vin'),

    create_time: createdAt('create_time'),
  },
  (x) => [primaryKey({ columns: [x.dongle_id, x.route_id, x.segment] })],
)
export type SegmentData = InferSelectModel<typeof segmentsTable>

export const athenaPingsTable = sqliteTable('athena_pings', {
  id: text('id').primaryKey(),
  dongle_id: text('dongle_id').notNull(),
  create_time: createdAt('create_time'),
})

export const statsTable = sqliteTable('stats', {
  id: text('id').primaryKey(),
  dongle_id: text('dongle_id').notNull(),
  raw: text('raw').notNull(),
  create_time: createdAt('create_time'),
})

export const logsTable = sqliteTable('logs', {
  id: text('id').primaryKey(),
  dongle_id: text('dongle_id').notNull(),
  raw: text('raw').notNull(),
  create_time: createdAt('create_time'),
})

export const athenaQueueTable = sqliteTable('athena_queue', {
  id: text('id').primaryKey(),
  dongle_id: text('dongle_id').notNull(),
  method: text('method').notNull(),
  params: text('params').notNull(),
  expiry: integer('expiry'),
  create_time: createdAt('create_time'),
})

export const filesTable = sqliteTable('files', {
  key: text('key').primaryKey(), // dongleId/path (e.g. dongleId/routeId/segment/file or dongleId/boot/file)
  dongle_id: text('dongle_id').notNull(),
  route_id: text('route_id'),
  segment: integer('segment'),
  file: text('file').notNull(),
  size: integer('size').notNull(),
  processingStatus: text('processing_status').$type<'queued' | 'processing' | 'done' | 'error'>().default('queued').notNull(),
  processingError: text('processing_error'),
  create_time: createdAt('create_time'),
  updated_time: integer('updated_time')
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now())
    .notNull(),
})

// RELATIONS
export const usersRelations = relations(usersTable, ({ many }) => ({
  devices: many(deviceUsersTable),
}))

export const devicesRelations = relations(devicesTable, ({ many }) => ({
  users: many(deviceUsersTable),
  segments: many(segmentsTable),
  pings: many(athenaPingsTable),
  athenaQueue: many(athenaQueueTable),
  files: many(filesTable),
}))

export const deviceUserRelations = relations(deviceUsersTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [deviceUsersTable.user_id],
    references: [usersTable.id],
  }),
  device: one(devicesTable, {
    fields: [deviceUsersTable.dongle_id],
    references: [devicesTable.dongle_id],
  }),
}))

export const routesRelations = relations(routesTable, ({ one, many }) => ({
  device: one(devicesTable, {
    fields: [routesTable.dongle_id],
    references: [devicesTable.dongle_id],
  }),
  segments: many(segmentsTable),
  files: many(filesTable),
}))

export const segmentsRelations = relations(segmentsTable, ({ one, many }) => ({
  device: one(devicesTable, {
    fields: [segmentsTable.dongle_id],
    references: [devicesTable.dongle_id],
  }),
  route: one(routesTable, {
    fields: [segmentsTable.dongle_id, segmentsTable.route_id],
    references: [routesTable.dongle_id, routesTable.route_id],
  }),
  files: many(filesTable),
}))

export const athenaPingsRelations = relations(athenaPingsTable, ({ one }) => ({
  device: one(devicesTable, {
    fields: [athenaPingsTable.dongle_id],
    references: [devicesTable.dongle_id],
  }),
}))

export const statsRelations = relations(statsTable, ({ one }) => ({
  device: one(devicesTable, {
    fields: [statsTable.dongle_id],
    references: [devicesTable.dongle_id],
  }),
}))
export const logsRelations = relations(logsTable, ({ one }) => ({
  device: one(devicesTable, {
    fields: [logsTable.dongle_id],
    references: [devicesTable.dongle_id],
  }),
}))

export const athenaQueueRelations = relations(athenaQueueTable, ({ one }) => ({
  device: one(devicesTable, {
    fields: [athenaQueueTable.dongle_id],
    references: [devicesTable.dongle_id],
  }),
}))

export const filesRelations = relations(filesTable, ({ one }) => ({
  device: one(devicesTable, {
    fields: [filesTable.dongle_id],
    references: [devicesTable.dongle_id],
  }),
  route: one(routesTable, {
    fields: [filesTable.dongle_id, filesTable.route_id],
    references: [routesTable.dongle_id, routesTable.route_id],
  }),
  segment: one(segmentsTable, {
    fields: [filesTable.dongle_id, filesTable.route_id, filesTable.segment],
    references: [segmentsTable.dongle_id, segmentsTable.route_id, segmentsTable.segment],
  }),
}))

// Uptime tracking - records server start/stop events
export const uptimeTable = sqliteTable('uptime', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  event: text('event').$type<'start' | 'stop'>().notNull(),
  timestamp: integer('timestamp').notNull(), // unix ms
})
