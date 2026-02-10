import { useState } from 'react'
import { useDevice } from '../../hooks/useDevice'
import { skills, Skill } from '../../../../shared/skills'
import { cn } from '../../../../shared/helpers'
import { PlusIcon, PlayIcon, Loader2Icon, TrashIcon, XIcon } from 'lucide-react'
import { Card, NotConnected, SectionLabel } from './ControlsTab'
import { api } from '../../api'
import { useRouteParams } from '../../hooks'

type InstalledSkill = Skill & { skill_id: string }

const AddSkillModal = ({ onClose, onAdd }: { onClose: () => void; onAdd: (skill: Skill) => void }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [bus, setBus] = useState(1)
  const [msgId, setMsgId] = useState('')
  const [count, setCount] = useState(10)
  const [data, setData] = useState('')

  const handleSubmit = () => {
    if (!name || !msgId || !data) return
    onAdd({
      skill_type: 'can_msg',
      name,
      description,
      bus,
      msg_id: msgId.startsWith('0x') ? parseInt(msgId, 16) : parseInt(msgId),
      count,
      data,
      platforms: [],
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background-alt rounded-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-medium">Add Custom Skill</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-background px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-white/30"
          />
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-background px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-white/30"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Bus</label>
              <input
                type="number"
                value={bus}
                onChange={(e) => setBus(parseInt(e.target.value))}
                className="w-full bg-background px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Count</label>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full bg-background px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Message ID (hex, e.g. 0x273)</label>
            <input
              type="text"
              placeholder="0x273"
              value={msgId}
              onChange={(e) => setMsgId(e.target.value)}
              className="w-full bg-background px-3 py-2 rounded-lg border border-white/10 text-sm font-mono focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Data (hex, 16 chars)</label>
            <input
              type="text"
              placeholder="0000000000000000"
              value={data}
              onChange={(e) => setData(e.target.value)}
              maxLength={16}
              className="w-full bg-background px-3 py-2 rounded-lg border border-white/10 text-sm font-mono focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
        <div className="p-4 border-t border-white/10 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || !msgId || !data}
            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

const SkillRow = ({
  skill,
  installed,
  onInstall,
  onRun,
  onRemove,
  loading,
}: {
  skill: Skill
  installed?: InstalledSkill
  onInstall: () => void
  onRun: () => void
  onRemove: () => void
  loading?: boolean
}) => (
  <div className="flex items-center gap-3 py-2.5 px-3">
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-medium">{skill.name}</div>
      <div className="text-xs text-white/35 mt-0.5">{skill.description}</div>
    </div>
    <div className="flex gap-2 shrink-0">
      {installed ? (
        <>
          <button
            onClick={onRun}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 transition-colors text-xs font-medium disabled:opacity-50"
          >
            {loading ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <PlayIcon className="w-3.5 h-3.5" />}
            Run
          </button>
          <button
            onClick={onRemove}
            disabled={loading}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-600/20 hover:bg-red-600/40 transition-colors disabled:opacity-50"
          >
            <TrashIcon className="w-3.5 h-3.5 text-red-400" />
          </button>
        </>
      ) : (
        <button
          onClick={onInstall}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-medium disabled:opacity-50"
        >
          {loading ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <PlusIcon className="w-3.5 h-3.5" />}
          Add
        </button>
      )}
    </div>
  </div>
)

const InstalledSkillRow = ({ skill, onRun, onRemove, loading }: { skill: InstalledSkill; onRun: () => void; onRemove: () => void; loading?: boolean }) => (
  <div className="flex items-center gap-3 py-2.5 px-3">
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-medium">{skill.name}</div>
      <div className="text-xs text-white/35 mt-0.5">{skill.description}</div>
    </div>
    <div className="flex gap-2 shrink-0">
      <button
        onClick={onRun}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 transition-colors text-xs font-medium disabled:opacity-50"
      >
        {loading ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <PlayIcon className="w-3.5 h-3.5" />}
        Run
      </button>
      <button
        onClick={onRemove}
        disabled={loading}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-600/20 hover:bg-red-600/40 transition-colors disabled:opacity-50"
      >
        <TrashIcon className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  </div>
)

export const AppsTab = ({ className }: { className?: string }) => {
  const { dongleId } = useRouteParams()
  const { call, params } = useDevice()
  const [loading, setLoading] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [routes] = api.routes.routesSegments.useQuery({ params: { dongleId }, query: { limit: 1 } })
  const platform = routes?.[0]?.platform

  if (!call || !params) return <NotConnected className={className} />

  const availableSkills = platform ? skills.filter((s) => s.platforms.includes(platform)) : skills

  const installedSkills = (params.Skills ?? {}) as Record<string, Omit<InstalledSkill, 'skill_id'>>
  const installedList = Object.entries(installedSkills).map(([skill_id, skill]) => ({ ...skill, skill_id }))

  const isInstalled = (skill: Skill) => installedList.find((s) => s.name === skill.name && s.msg_id === skill.msg_id && s.data === skill.data)

  const handleInstall = async (skill: Skill) => {
    setLoading(skill.name)
    await call('addSkill', skill)
    const updated = await call('getSkills', undefined)
    if (updated) params.Skills = updated
    setLoading(null)
  }

  const handleRun = async (skillId: string) => {
    setLoading(skillId)
    await call('runSkill', { skill_id: skillId })
    setLoading(null)
  }

  const handleRemove = async (skillId: string) => {
    setLoading(skillId)
    await call('removeSkill', { skill_id: skillId })
    const updated = await call('getSkills', undefined)
    if (updated) params.Skills = updated
    setLoading(null)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {showAddModal && <AddSkillModal onClose={() => setShowAddModal(false)} onAdd={handleInstall} />}

      <button
        onClick={() => setShowAddModal(true)}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-sm font-medium"
      >
        <PlusIcon className="w-4 h-4" />
        Add Custom Skill
      </button>

      {installedList.length > 0 && (
        <>
          <SectionLabel>Installed</SectionLabel>
          <Card>
            {installedList.map((skill) => (
              <InstalledSkillRow
                key={skill.skill_id}
                skill={skill as InstalledSkill}
                onRun={() => handleRun(skill.skill_id)}
                onRemove={() => handleRemove(skill.skill_id)}
                loading={loading === skill.skill_id}
              />
            ))}
          </Card>
        </>
      )}

      <SectionLabel>Available Skills</SectionLabel>
      <Card>
        {availableSkills.map((skill) => {
          const installed = isInstalled(skill)
          return (
            <SkillRow
              key={skill.name}
              skill={skill}
              installed={installed as InstalledSkill | undefined}
              onInstall={() => handleInstall(skill)}
              onRun={() => installed && handleRun(installed.skill_id)}
              onRemove={() => installed && handleRemove(installed.skill_id)}
              loading={loading === skill.name || (installed && loading === installed.skill_id)}
            />
          )
        })}
      </Card>
    </div>
  )
}
