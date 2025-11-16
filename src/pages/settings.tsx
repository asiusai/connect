import clsx from 'clsx'

import type { Device, PrimePlan } from '../types'
import { formatDate } from '../utils/format'

import { ButtonBase } from '../components/material/ButtonBase'
import { Button } from '../components/material/Button'
import { Icon } from '../components/material/Icon'
import { IconButton } from '../components/material/IconButton'
import { TopAppBar } from '../components/material/TopAppBar'
import { ReactNode, Suspense, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api'
import { useDevice, usePortal, useStripeSession, useSubscribeInfo, useSubscription } from '../api/queries'
import { useDongleId } from '../utils/hooks'

const formatCurrency = (amount: number) => `$${(amount / 100).toFixed(amount % 100 === 0 ? 0 : 2)}`

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
      <div className="flex w-full gap-2 xs:gap-4">
        {plans.map((plan) => (
          <ButtonBase
            key={plan.name}
            className={clsx(
              'flex grow basis-0 flex-col items-center justify-center gap-2 rounded-lg p-2 text-center xs:p-4',
              'state-layer bg-tertiary text-on-tertiary transition before:bg-on-tertiary',
              selectedPlan === plan.name && 'ring-4 ring-on-tertiary',
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

const PrimeCheckout = ({ dongleId }: { dongleId: string }) => {
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
        <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
          <Icon name="error" className="text-error" size="20" />
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
        <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
          <Icon name="info" size="20" />
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

const PrimeManage = ({ dongleId }: { dongleId: string }) => {
  const stripeSessionId = new URLSearchParams(useLocation().search).get('stripe_success')!
  const [stripeSession] = useStripeSession(dongleId, stripeSessionId)

  // TODO: we should wait for the session to be paid before fetching subscription
  const [subscription] = useSubscription(dongleId)
  const [cancelDialog, setCancelDialog] = useState(false)

  const cancel = api.prime.cancel.useMutation()
  const [portal] = usePortal(dongleId)

  const loading = !subscription || cancel.isPending || !portal || !stripeSession
  const paymentStatus = stripeSession?.payment_status
  return (
    <div className="flex flex-col gap-4">
      <Suspense
        fallback={
          <div className="my-2 flex flex-col items-center gap-4">
            <Icon name="autorenew" className="animate-spin" size="40" />
            <span className="text-md">Fetching subscription status...</span>
          </div>
        }
      >
        {!stripeSession ? (
          <div className="flex gap-2 rounded-sm bg-on-error-container p-2 text-sm font-semibold text-error-container">
            <Icon name="error" size="20" />
            Unable to check payment status
          </div>
        ) : paymentStatus === 'unpaid' ? (
          <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
            <Icon name="payments" size="20" />
            Waiting for confirmed payment...
          </div>
        ) : paymentStatus === 'paid' && !subscription ? (
          <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
            <Icon className="animate-spin" name="autorenew" size="20" />
            Processing subscription...
          </div>
        ) : paymentStatus === 'paid' && subscription ? (
          <div className="flex gap-2 rounded-sm bg-tertiary-container p-2 text-sm text-on-tertiary-container">
            <Icon name="check" size="20" />
            <div className="flex flex-col gap-2">
              <p className="font-semibold">comma prime activated</p>
              {subscription.is_prime_sim &&
                ' Connectivity will be enabled as soon as activation propogates to your local cell tower. Rebooting your device may help.'}
            </div>
          </div>
        ) : null}

        {cancel.isError ? (
          <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
            <Icon className="text-error" name="error" size="20" />
            Failed to cancel subscription: {cancel.error as any}
          </div>
        ) : cancel.isSuccess ? (
          <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
            <Icon name="check" size="20" />
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
      </Suspense>

      {cancelDialog && (
        <div
          className="bg-scrim/10 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setCancelDialog(false)}
        >
          <div className="flex size-full flex-col gap-4 bg-surface-container p-6 sm:h-auto sm:max-w-lg sm:rounded-lg sm:shadow-lg">
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

const DeviceSettingsForm = ({ dongleId, device }: { dongleId: string; device: Device }) => {
  const unpair = api.devices.unpair.useMutation({
    onSuccess: (res) => {
      if (res.body.success) window.location.href = window.location.origin
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg">{device.name}</h2>
      {unpair.error && (
        <div className="flex gap-2 rounded-sm bg-surface-container-high p-2 text-sm text-on-surface">
          <Icon className="text-error" name="error" size="20" />
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

export const Component = () => {
  const dongleId = useDongleId()
  const [device] = useDevice(dongleId)

  if (!device) return null
  return (
    <>
      <TopAppBar component="h2" leading={<IconButton className="md:hidden" name="arrow_back" href={`/${dongleId}`} />}>
        Device Settings
      </TopAppBar>
      <div className="flex flex-col gap-4 max-w-lg px-4">
        <DeviceSettingsForm dongleId={dongleId} device={device} />

        <hr className="mx-4 opacity-20" />

        <h2 className="text-lg">comma prime</h2>
        <Suspense fallback={<div className="h-64 skeleton-loader rounded-md" />}>
          {!device.prime ? <PrimeCheckout dongleId={dongleId} /> : <PrimeManage dongleId={dongleId} />}
        </Suspense>
      </div>
    </>
  )
}
