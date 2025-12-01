import clsx from 'clsx'

import { getDeviceName, type PrimePlan } from '../types'
import { formatCurrency, formatDate, isImperial } from '../utils/format'

import { ButtonBase } from '../components/material/ButtonBase'
import { Icon } from '../components/material/Icon'
import { TopAppBar } from '../components/material/TopAppBar'
import { Toggle } from '../components/material/Toggle'
import { BackButton } from '../components/material/BackButton'
import { ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { storage } from '../utils/helpers'
import { useDevice, useDevices, usePortal, useStripeSession, useSubscribeInfo, useSubscription, useUsers } from '../api/queries'
import { useParams } from '../utils/hooks'

type PlanProps = {
  name: PrimePlan
  amount: number
  description: string
  disabled?: boolean
}

const PrimePlanName: Record<PrimePlan, string> = {
  nodata: 'Lite',
  data: 'Standard',
}

const PlanSelector = ({
  selectedPlan,
  setSelectedPlan,
  disabled,
  plans,
}: {
  selectedPlan: PrimePlan | undefined
  setSelectedPlan: (p: PrimePlan | undefined) => void
  disabled?: boolean
  plans: PlanProps[]
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={clsx(
            'flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all',
            selectedPlan === plan.name ? 'border-white bg-white/10' : 'border-white/5 hover:border-white/20 bg-background-alt',
            (plan.disabled || disabled) && 'opacity-50 cursor-not-allowed pointer-events-none',
          )}
          onClick={() => setSelectedPlan(plan.name)}
        >
          <span className="text-sm font-medium text-white/60">{PrimePlanName[plan.name]}</span>
          <span className="text-xl font-bold">{formatCurrency(plan.amount)}/mo</span>
          <span className="text-xs text-white/40">{plan.description}</span>
        </div>
      ))}
    </div>
  )
}

const PrimeCheckout = () => {
  const { dongleId } = useParams()

  const [selectedPlan, setSelectedPlan] = useState<PrimePlan | undefined>()
  const [device] = useDevice(dongleId)

  const [subscribeInfo] = useSubscribeInfo(dongleId)

  const search = useLocation().search
  const stripeCancelled = new URLSearchParams(search).has('stripe_cancelled')
  const checkout = api.prime.getCheckout.useMutation({
    onSuccess: (res) => {
      if (res.body.url) window.location.href = res.body.url
    },
  })

  const isLoading = !subscribeInfo || checkout.isPending

  if (!device || !subscribeInfo) return null

  let trialEndDate: number | null, trialClaimable: boolean
  if (selectedPlan === 'data') {
    trialEndDate = subscribeInfo.trial_end_data
    trialClaimable = !!trialEndDate
  } else if (selectedPlan === 'nodata') {
    trialEndDate = subscribeInfo.trial_end_nodata
    trialClaimable = !!trialEndDate
  } else {
    trialEndDate = null
    trialClaimable = Boolean(subscribeInfo.trial_end_data && subscribeInfo.trial_end_nodata)
  }

  let checkoutText: string
  if (selectedPlan) checkoutText = trialClaimable ? 'Claim trial' : 'Go to checkout'
  else {
    checkoutText = 'Select a plan'
    if (trialClaimable) checkoutText += ' to claim trial'
  }

  let chargeText: string = ''
  if (selectedPlan && trialClaimable) {
    chargeText = `Your first charge will be on ${formatDate(trialEndDate)}, then monthly thereafter.`
  }

  let disabledDataPlanText: ReactNode
  if (!device.eligible_features?.prime_data) {
    disabledDataPlanText = 'Standard plan is not available for your device.'
  } else if (!subscribeInfo.sim_id && subscribeInfo.device_online) {
    disabledDataPlanText = 'Standard plan not available, no SIM was detected. Ensure SIM is securely inserted and try again.'
  } else if (!subscribeInfo.sim_id) {
    disabledDataPlanText = 'Standard plan not available, device could not be reached. Connect device to the internet and try again.'
  } else if (!subscribeInfo.is_prime_sim || !subscribeInfo.sim_type) {
    disabledDataPlanText = 'Standard plan not available, detected a third-party SIM.'
  } else if (!['blue', 'magenta_new', 'webbing'].includes(subscribeInfo.sim_type!)) {
    disabledDataPlanText = [
      'Standard plan not available, old SIM type detected, new SIM cards are available in the ',
      <a className="text-blue-400 underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
        shop
      </a>,
    ]
  } else if (subscribeInfo.sim_usable === false && subscribeInfo.sim_type === 'blue') {
    disabledDataPlanText = [
      'Standard plan not available, SIM has been canceled and is therefore no longer usable, new SIM cards are available in the ',
      <a className="text-blue-400 underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
        shop
      </a>,
    ]
  } else if (subscribeInfo.sim_usable === false) {
    disabledDataPlanText = [
      'Standard plan not available, SIM is no longer usable, new SIM cards are available in the ',
      <a className="text-blue-400 underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
        shop
      </a>,
    ]
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="ml-5 list-disc text-sm text-white/60 space-y-1">
        <li>24/7 connectivity</li>
        <li>Take pictures remotely</li>
        <li>1 year storage of drive videos</li>
        <li>Simple SSH for developers</li>
      </ul>

      <p className="text-sm text-white/60">
        Learn more from our{' '}
        <a className="text-blue-400 hover:underline" href="https://comma.ai/connect#comma-connect-and-prime" target="_blank" rel="noopener">
          FAQ
        </a>
        .
      </p>

      {stripeCancelled && (
        <div className="flex gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
          <Icon name="error" className="text-xl shrink-0" />
          Checkout cancelled
        </div>
      )}

      <PlanSelector
        selectedPlan={selectedPlan}
        setSelectedPlan={setSelectedPlan}
        disabled={isLoading}
        plans={[
          { name: 'nodata', amount: 1000, description: 'bring your own sim card' },
          {
            name: 'data',
            amount: 2400,
            description: 'including data plan, only offered in the U.S.',
            disabled: !!disabledDataPlanText,
          },
        ]}
      />

      {disabledDataPlanText && (
        <div className="flex gap-2 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-400 border border-blue-500/20">
          <Icon name="info" className="text-xl shrink-0" />
          <div>{disabledDataPlanText}</div>
        </div>
      )}

      {checkoutText && (
        <ButtonBase
          className={clsx(
            'w-full py-3 rounded-xl font-bold text-center transition-colors',
            selectedPlan ? 'bg-white text-black hover:bg-white/90' : 'bg-white/10 text-white/40 cursor-not-allowed',
          )}
          disabled={!selectedPlan || checkout.isPending}
          onClick={() => checkout.mutate({ body: { dongle_id: dongleId, plan: selectedPlan, sim_id: subscribeInfo!.sim_id! } })}
        >
          {checkout.isPending ? 'Loading...' : checkoutText}
        </ButtonBase>
      )}

      {chargeText && <p className="text-xs text-white/40 text-center">{chargeText}</p>}
    </div>
  )
}

const StripeSession = ({ id }: { id: string }) => {
  const { dongleId } = useParams()
  const [stripeSession] = useStripeSession(dongleId, id)
  const [subscription] = useSubscription(dongleId)
  const paymentStatus = stripeSession?.payment_status

  if (!stripeSession || !subscription)
    return (
      <div className="flex gap-2 rounded-lg bg-background-alt p-3 text-sm text-white/60">
        <Icon className="animate-spin text-xl" name="autorenew" />
        Processing subscription...
      </div>
    )

  if (paymentStatus === 'unpaid')
    return (
      <div className="flex gap-2 rounded-lg bg-background-alt p-3 text-sm text-white/60">
        <Icon name="payments" className="text-xl" />
        Waiting for confirmed payment...
      </div>
    )
  if (paymentStatus === 'paid' && subscription)
    return (
      <div className="flex gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-400 border border-green-500/20">
        <Icon name="check" className="text-xl" />
        <div className="flex flex-col gap-1">
          <p className="font-bold">comma prime activated</p>
          {subscription.is_prime_sim &&
            ' Connectivity will be enabled as soon as activation propogates to your local cell tower. Rebooting your device may help.'}
        </div>
      </div>
    )
  return null
}

const PrimeManage = () => {
  const { dongleId } = useParams()

  const stripeSessionId = new URLSearchParams(useLocation().search).get('stripe_success')!

  const [subscription, { refetch }] = useSubscription(dongleId)
  const [cancelDialog, setCancelDialog] = useState(false)

  const cancel = api.prime.cancel.useMutation({ onSuccess: () => refetch() })
  const [portal] = usePortal(dongleId)

  const loading = !subscription || cancel.isPending || !portal
  return (
    <div className="flex flex-col gap-4">
      {stripeSessionId && <StripeSession id={stripeSessionId} />}

      {cancel.isError ? (
        <div className="flex gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
          <Icon className="text-xl" name="error" />
          Failed to cancel subscription: {cancel.error as any}
        </div>
      ) : cancel.isSuccess ? (
        <div className="flex gap-2 rounded-lg bg-background-alt p-3 text-sm text-white/60">
          <Icon name="check" className="text-xl" />
          Subscription cancelled
        </div>
      ) : null}

      {subscription && (
        <>
          <div className="flex flex-col gap-2 bg-background-alt rounded-xl p-4">
            <div className="flex justify-between">
              <span className="text-white/60">Plan</span>
              <span className="font-medium">{subscription.plan ? PrimePlanName[subscription.plan] : 'unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Amount</span>
              <span className="font-medium">{formatCurrency(subscription.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Joined</span>
              <span className="font-medium">{formatDate(subscription.subscribed_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Next payment</span>
              <span className="font-medium">{formatDate(subscription.next_charge_at)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ButtonBase
              className="py-3 rounded-xl font-medium text-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              disabled={loading}
              onClick={() => setCancelDialog(true)}
            >
              {cancel.isPending ? 'Cancelling...' : 'Cancel subscription'}
            </ButtonBase>
            <ButtonBase
              className="py-3 rounded-xl font-medium text-center bg-white/10 text-white hover:bg-white/20 transition-colors"
              disabled={loading}
              href={portal?.url}
            >
              Update payment method
            </ButtonBase>
          </div>
        </>
      )}

      {cancelDialog && (
        <div
          className="bg-black/60 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
          onClick={() => setCancelDialog(false)}
        >
          <div className="flex w-full flex-col gap-4 bg-surface p-6 rounded-2xl shadow-2xl max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold">Cancel subscription</h2>
            <p className="text-white/60">Are you sure you want to cancel your subscription?</p>
            <div className="flex flex-col gap-3 mt-2">
              <ButtonBase
                className="py-3 rounded-xl font-bold text-center bg-red-500 text-white hover:bg-red-600 transition-colors"
                disabled={loading}
                onClick={() => {
                  cancel.mutate({ body: { dongle_id: dongleId } })
                  setCancelDialog(false)
                }}
              >
                {cancel.isPending ? 'Cancelling...' : 'Yes, cancel subscription'}
              </ButtonBase>
              <ButtonBase
                className="py-3 rounded-xl font-medium text-center bg-white/10 text-white hover:bg-white/20 transition-colors"
                disabled={loading}
                onClick={() => setCancelDialog(false)}
              >
                No, keep subscription
              </ButtonBase>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const UserManagement = () => {
  const { dongleId } = useParams()

  const [users, { refetch }] = useUsers(dongleId)
  const addUser = api.devices.addUser.useMutation({
    onSuccess: () => {
      setEmail('')
      setIsAdding(false)
      refetch()
    },
  })
  const deleteUser = api.devices.deleteUser.useMutation({
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
            <Icon name="add" className="text-xl" />
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
            <ButtonBase
              className="flex-1 py-2 rounded-lg bg-white/10 text-white font-medium text-sm text-center"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </ButtonBase>
          </div>
        </div>
      )}

      {addUser.error && (
        <div className="flex gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
          <Icon className="text-xl" name="error" />
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
                <Icon name="delete" className="text-xl" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const DeviceSettingsForm = () => {
  const { dongleId } = useParams()
  const navigate = useNavigate()
  const [device, { refetch }] = useDevice(dongleId)
  const [_, devices] = useDevices()
  const [alias, setAlias] = useState('')
  useEffect(() => setAlias(device?.alias || ''), [device?.alias])

  const unpair = api.devices.unpair.useMutation({
    onSuccess: (res) => {
      if (res.body.success) navigate(window.location.origin)
    },
  })
  const changeName = api.devices.set.useMutation({
    onSuccess: () => {
      refetch()
      devices.refetch()
    },
  })

  if (!device) return null
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold px-2">Device</h2>
      <div className="bg-background-alt rounded-xl p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-white/40">Alias</label>
          <div className="flex items-center gap-2">
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="w-full bg-transparent border-b border-white/10 py-1 text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors font-medium"
              placeholder={getDeviceName(device)}
            />
            {alias !== device.alias && (
              <ButtonBase
                className="px-3 py-1 rounded-md bg-white text-black text-xs font-bold"
                onClick={() => changeName.mutate({ body: { alias }, params: { dongleId } })}
                disabled={changeName.isPending}
              >
                Save
              </ButtonBase>
            )}
          </div>
        </div>
      </div>

      {unpair.error && (
        <div className="flex gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
          <Icon className="text-xl" name="error" />
          {(unpair.error as any) || 'Unknown error'}
        </div>
      )}

      <ButtonBase
        className="flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium"
        onClick={() => {
          if (confirm('Are you sure you want to unpair this device?')) {
            unpair.mutate({ body: {}, params: { dongleId } })
          }
        }}
        disabled={unpair.isPending}
      >
        <Icon name="delete" />
        Unpair this device
      </ButtonBase>
    </div>
  )
}

const UnitSettings = () => {
  const [imperial, setImperial] = useState(isImperial())
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold px-2">Preferences</h2>
      <div className="bg-background-alt rounded-xl p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">Imperial units</span>
          <span className="text-xs text-white/60">Use miles instead of kilometers</span>
        </div>
        <div
          className={clsx('w-12 h-7 rounded-full p-1 transition-colors cursor-pointer relative', imperial ? 'bg-white' : 'bg-white/10')}
          onClick={() => {
            const newVal = !imperial
            setImperial(newVal)
            storage.set('imperial', String(newVal))
          }}
        >
          <div
            className={clsx(
              'w-5 h-5 rounded-full shadow-sm transition-all absolute top-1',
              imperial ? 'bg-black left-[24px]' : 'bg-white left-1',
            )}
          />
        </div>
      </div>
    </div>
  )
}

export const Component = () => {
  const { dongleId } = useParams()
  const [device] = useDevice(dongleId)
  const navigate = useNavigate()

  if (!device) return null
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton fallback={`/${dongleId}`} />}>Settings</TopAppBar>

      <div className="flex flex-col gap-8 px-4 py-6 pb-20 max-w-2xl mx-auto w-full">
        <DeviceSettingsForm />
        <UnitSettings />
        <UserManagement />

        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold px-2">comma prime</h2>
          {!device.prime ? <PrimeCheckout /> : <PrimeManage />}
        </div>
      </div>
    </div>
  )
}
