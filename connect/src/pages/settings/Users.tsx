import { ButtonBase } from '../../components/ButtonBase'
import { CircleAlertIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../api'
import { useRouteParams } from '../../hooks'

export const Users = () => {
  const { dongleId } = useRouteParams()

  let [users, { refetch }] = api.users.get.useQuery({ params: { dongleId } })
  console.log(users)
  // needed for Konik API
  if (users && typeof users === 'object' && 'users' in users) users = users.users as any

  const addUser = api.users.addUser.useMutation({
    onSuccess: () => {
      setEmail('')
      setIsAdding(false)
      refetch()
    },
  })
  const deleteUser = api.users.deleteUser.useMutation({
    onSuccess: () => refetch(),
  })
  const [email, setEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold">Users</h2>
        {!isAdding && (
          <div className="p-2 -mr-2 cursor-pointer hover:bg-white/10 rounded-full transition-colors" onClick={() => setIsAdding(true)}>
            <PlusIcon className="text-xl" />
          </div>
        )}
      </div>

      {isAdding && (
        <div className="flex flex-col gap-3 bg-background-alt p-4 rounded-xl">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-b border-white/20 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white transition-colors"
            placeholder="Email address"
            autoFocus
          />
          <div className="flex gap-3">
            <ButtonBase
              className="flex-1 py-2 rounded-lg bg-white text-black font-medium text-sm text-center"
              onClick={() => {
                if (!email) return
                addUser.mutate({ body: { email }, params: { dongleId } })
              }}
              disabled={!email || addUser.isPending}
            >
              {addUser.isPending ? 'Adding...' : 'Add'}
            </ButtonBase>
            <ButtonBase className="flex-1 py-2 rounded-lg bg-white/10 text-white font-medium text-sm text-center" onClick={() => setIsAdding(false)}>
              Cancel
            </ButtonBase>
          </div>
        </div>
      )}

      {addUser.error && (
        <div className="flex gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
          <CircleAlertIcon className="text-xl" />
          {(addUser.error as any) || 'Failed to add user'}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {users?.map((user) => (
          <div key={user.email} className="flex items-center justify-between rounded-xl bg-background-alt p-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.email}</span>
              <span className="text-xs text-white/40 capitalize">{user.permission.replace('_', ' ')}</span>
            </div>
            {user.permission !== 'owner' && (
              <div
                className="p-2 -mr-2 cursor-pointer hover:bg-white/10 rounded-full text-red-400 transition-colors"
                onClick={() => {
                  if (!confirm(`Are you sure you want to remove ${user.email}?`)) return
                  deleteUser.mutate({ body: { email: user.email }, params: { dongleId } })
                }}
              >
                <Trash2Icon className="text-xl" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
