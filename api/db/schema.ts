import { relations, InferSelectModel } from 'drizzle-orm'
import { integer, sqliteTable, text, real, primaryKey } from 'drizzle-orm/sqlite-core'
import { Permission } from '../../connect/src/types'

const createdAt = (name: string) =>
  integer(name, { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull()

export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  regdate: integer('regdate', { mode: 'timestamp' }).notNull(),
  superuser: integer('superuser', { mode: 'boolean' }).default(false),
  user_id: text('user_id').notNull(),
  username: text('username'),

  create_time: createdAt('created_time'),
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
    permission: text('permission').$type<Permission>(),

    create_time: createdAt('create_time'),
  },
  (x) => [primaryKey({ columns: [x.user_id, x.dongle_id] })],
)
export type DeviceUserData = InferSelectModel<typeof deviceUsersTable>

export const routesTable = sqliteTable('routes', {
  fullname: text('fullname').primaryKey(),
  dongle_id: text('dongle_id').notNull(),
  end_lat: real('end_lat'),
  end_lng: real('end_lng'),
  end_time: text('end_time'),
  git_branch: text('git_branch'),
  git_commit: text('git_commit'),
  git_commit_date: text('git_commit_date'),
  git_dirty: integer('git_dirty', { mode: 'boolean' }),
  git_remote: text('git_remote'),
  is_public: integer('is_public', { mode: 'boolean' }).notNull(),
  is_preserved: integer('is_public', { mode: 'boolean' }).notNull(),
  distance: real('distance'),
  maxqlog: real('maxqlog').notNull(),
  platform: text('platform'),
  procqlog: real('procqlog').notNull(),
  start_lat: real('start_lat'),
  start_lng: real('start_lng'),
  start_time: text('start_time'),
  url: text('url'),
  version: text('version'),
  vin: text('vin'),
  make: text('make'),
  id: real('id'),
  car_id: real('car_id'),
  version_id: real('version_id'),

  create_time: createdAt('create_time'),
})

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

// RELATIONS
export const usersRelations = relations(usersTable, ({ many }) => ({
  devices: many(deviceUsersTable),
}))

export const devicesRelations = relations(devicesTable, ({ many }) => ({
  users: many(deviceUsersTable),
  routes: many(routesTable),
  pings: many(athenaPingsTable),
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

export const routesRelations = relations(routesTable, ({ one }) => ({
  device: one(devicesTable, {
    fields: [routesTable.dongle_id],
    references: [devicesTable.dongle_id],
  }),
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
export const logsRelations = relations(statsTable, ({ one }) => ({
  device: one(devicesTable, {
    fields: [statsTable.dongle_id],
    references: [devicesTable.dongle_id],
  }),
}))
