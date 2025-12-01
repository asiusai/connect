import clsx from 'clsx'

import { getDeviceName, type PrimePlan } from '../types'
import { formatCurrency, formatDate, isImperial } from '../utils/format'

import { ButtonBase } from '../components/material/ButtonBase'
import { Button } from '../components/material/Button'
import { Icon } from '../components/material/Icon'
import { IconButton } from '../components/material/IconButton'
import { TopAppBar } from '../components/material/TopAppBar'
import { Toggle } from '../components/material/Toggle'
import { ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { storage } from '../utils/helpers'
import { useDevice, useDevices, usePortal, useStripeSession, useSubscribeInfo, useSubscription, useUsers } from '../api/queries'
import { useParams } from '../utils/hooks'
import { TextField } from '../components/material/TextField'
import { BackButton } from '../components/material/BackButton'

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
    <div className="relative">
      <div className="flex w-full gap-2 min-[411px]:gap-4">
        {plans.map((plan) => (
          <ButtonBase
            key={plan.name}
            className={clsx(
              'flex grow basis-0 flex-col items-center justify-center gap-2 rounded-lg p-2 text-center min-[411px]:p-4',
              'state-layer bg-tertiary text-tertiary-x transition before:bg-tertiary-x',
              selectedPlan === plan.name && 'ring-4 ring-tertiary-x',
              plan.disabled && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => setSelectedPlan(plan.name)}
            disabled={plan.disabled || disabled}
          >
            <span className="text-md">{PrimePlanName[plan.name].toLowerCase()}</span>
            <span className="text-lg font-bold">{formatCurrency(plan.amount)}/month</span>
            <span className="text-xs">{plan.description}</span>
          </ButtonBase>
        ))}
      </div>
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
      <a className="text-tertiary underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
        shop
      </a>,
    ]
  } else if (subscribeInfo.sim_usable === false && subscribeInfo.sim_type === 'blue') {
    disabledDataPlanText = [
      'Standard plan not available, SIM has been canceled and is therefore no longer usable, new SIM cards are available in the ',
      <a className="text-tertiary underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
        shop
      </a>,
    ]
  } else if (subscribeInfo.sim_usable === false) {
    disabledDataPlanText = [
      'Standard plan not available, SIM is no longer usable, new SIM cards are available in the ',
      <a className="text-tertiary underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
        shop
      </a>,
    ]
  }

  return (
    <div className="grid gap-4">
      <ul className="ml-8 list-disc">
        <li>24/7 connectivity</li>
        <li>Take pictures remotely</li>
        <li>1 year storage of drive videos</li>
        <li>Simple SSH for developers</li>
      </ul>

      <p>
        Learn more from our{' '}
        <a className="text-tertiary underline" href="https://comma.ai/connect#comma-connect-and-prime" target="_blank" rel="noopener">
          FAQ
        </a>
        .
      </p>

      {stripeCancelled && (
        <div className="flex gap-2 rounded-lg bg-background-alt p-2 text-sm text-background-x">
          <Icon name="error" className="text-error text-xl" />
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
        <div className="flex gap-2 rounded-lg bg-background-alt p-2 text-sm text-background-x">
          <Icon name="info" className="text-xl" />
          {disabledDataPlanText}
        </div>
      )}

      {checkoutText && (
        <Button
          color="tertiary"
          disabled={!selectedPlan}
          loading={checkout.isPending}
          onClick={() => checkout.mutate({ body: { dongle_id: dongleId, plan: selectedPlan, sim_id: subscribeInfo!.sim_id! } })}
        >
          {checkoutText}
        </Button>
      )}

      {chargeText && <p className="text-sm">{chargeText}</p>}
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
      <div className="flex gap-2 rounded-lg bg-background-alt p-2 text-sm text-background-x">
        <Icon className="animate-spin text-xl" name="autorenew" />
        Processing subscription...
      </div>
    )

  if (paymentStatus === 'unpaid')
    return (
      <div className="flex gap-2 rounded-lg bg-background-alt p-2 text-sm text-background-x">
        <Icon name="payments" className="text-xl" />
        Waiting for confirmed payment...
      </div>
    )
  if (paymentStatus === 'paid' && subscription)
    return (
      <div className="flex gap-2 rounded-lg bg-tertiary-alt p-2 text-sm text-tertiary-x-alt">
        <Icon name="check" className="text-xl" />
        <div className="flex flex-col gap-2">
          <p className="font-semibold">comma prime activated</p>
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
        <div className="flex gap-2 rounded-lg bg-background-alt p-2 text-sm text-background-x">
          <Icon className="text-error text-xl" name="error" />
          Failed to cancel subscription: {cancel.error as any}
        </div>
      ) : cancel.isSuccess ? (
        <div className="flex gap-2 rounded-lg bg-background-alt p-2 text-sm text-background-x">
          <Icon name="check" className="text-xl" />
          Subscription cancelled
        </div>
      ) : null}

      {subscription && (
        <>
          <div className="flex list-none flex-col">
            <li>Plan: {subscription.plan ? PrimePlanName[subscription.plan] : 'unknown'}</li>
            <li>Amount: {formatCurrency(subscription.amount)}</li>
            <li>Joined: {formatDate(subscription.subscribed_at)}</li>
            <li>Next payment: {formatDate(subscription.next_charge_at)}</li>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button color="error" disabled={loading} loading={cancel.isPending} onClick={() => setCancelDialog(true)}>
              Cancel subscription
            </Button>
            <Button color="secondary" disabled={loading} loading={!portal} href={portal?.url}>
              Update payment method
            </Button>
          </div>
        </>
      )}

      {cancelDialog && (
        <div
          className="bg-black/10 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setCancelDialog(false)}
        >
          <div className="flex size-full flex-col gap-4 bg-background-alt p-6 sm:h-auto sm:max-w-lg sm:rounded-2xl sm:shadow-lg">
            <h2 className="text-lg">Cancel subscription</h2>
            <p className="text-sm">Are you sure you want to cancel your subscription?</p>
            <div className="mt-4 flex flex-wrap justify-stretch gap-4">
              <Button
                color="error"
                disabled={loading}
                loading={cancel.isPending}
                onClick={() => {
                  cancel.mutate({ body: { dongle_id: dongleId } })
                  setCancelDialog(false)
                }}
              >
                Yes, cancel subscription
              </Button>
              <Button color="secondary" disabled={loading} onClick={() => setCancelDialog(false)}>
                No, keep subscription
              </Button>
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Users</h2>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} leading={<Icon name="add" />}>
            Add User
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="flex items-center gap-2">
          <TextField value={email} onChange={setEmail} className="w-full" label="Email" />
          <Button
            onClick={() => {
              if (!email) return
              addUser.mutate({ body: { email }, params: { dongleId } })
            }}
            loading={addUser.isPending}
            disabled={!email}
          >
            Add
          </Button>
          <Button color="secondary" onClick={() => setIsAdding(false)}>
            Cancel
          </Button>
        </div>
      )}

      {addUser.error && (
        <div className="flex gap-2 rounded-lg bg-background-alt p-2 text-sm text-background-x">
          <Icon className="text-error text-xl" name="error" />
          {(addUser.error as any) || 'Failed to add user'}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {users?.map((user) => (
          <div key={user.email} className="flex items-center justify-between rounded-2xl bg-background-alt p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.email}</span>
              <span className="text-xs text-background-alt-x capitalize">{user.permission.replace('_', ' ')}</span>
            </div>
            {user.permission !== 'owner' && (
              <IconButton
                title="Delete"
                name="delete"
                className="text-error"
                onClick={() => {
                  if (!confirm(`Are you sure you want to remove ${user.email}?`)) return
                  deleteUser.mutate({ body: { email: user.email }, params: { dongleId } })
                }}
                disabled={deleteUser.isPending}
              />
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
      <h2 className="text-lg">{getDeviceName(device)}</h2>
      <div className="flex items-center gap-2">
        <TextField value={alias} onChange={setAlias} className="w-full" label="Alias" />
        <Button onClick={() => changeName.mutate({ body: { alias }, params: { dongleId } })} loading={changeName.isPending}>
          Save
        </Button>
      </div>
      {unpair.error && (
        <div className="flex gap-2 rounded-lg bg-background-alt p-2 text-sm text-background-x">
          <Icon className="text-error text-xl" name="error" />
          {(unpair.error as any) || 'Unknown error'}
        </div>
      )}
      <Button
        color="error"
        leading={<Icon name="delete" />}
        onClick={() => unpair.mutate({ body: {}, params: { dongleId } })}
        disabled={unpair.isPending}
      >
        Unpair this device
      </Button>
    </div>
  )
}

const UnitSettings = () => {
  const [imperial, setImperial] = useState(isImperial())
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-lg">Imperial units</span>
        <span className="text-sm text-background-alt-x">Use miles instead of kilometers</span>
      </div>
      <Toggle
        value={imperial}
        onChange={(v) => {
          setImperial(v)
          storage.set('imperial', String(v))
        }}
      />
    </div>
  )
}

export const Component = () => {
  const { dongleId } = useParams()
  const [device] = useDevice(dongleId)

  if (!device) return null
  return (
    <>
      <TopAppBar component="h2" leading={<BackButton fallback={`/${dongleId}`} />}>
        Device Settings
      </TopAppBar>
      <div className="flex flex-col gap-4 px-4 w-full">
        <DeviceSettingsForm />

        <hr className="mx-4 opacity-20" />

        <UnitSettings />

        <hr className="mx-4 opacity-20" />

        <UserManagement />

        <hr className="mx-4 opacity-20" />

        <h2 className="text-lg">comma prime</h2>
        {!device.prime ? <PrimeCheckout /> : <PrimeManage />}
      </div>
    </>
  )
}
