import clsx from 'clsx'

import { getDevice, unpairDevice } from '~/api/devices'
import {
  cancelSubscription,
  getStripeCheckout,
  getStripePortal,
  getStripeSession,
  getSubscribeInfo,
  getSubscriptionStatus,
} from '~/api/prime'
import type { Device } from '~/api/types'
import { formatDate } from '~/utils/format'

import { ButtonBase } from '~/components/material/ButtonBase'
import { Button } from '~/components/material/Button'
import { Icon } from '~/components/material/Icon'
import { IconButton } from '~/components/material/IconButton'
import { TopAppBar } from '~/components/material/TopAppBar'
import { createQuery } from '~/utils/createQuery'
import { getDeviceName } from '~/utils/device'
import { ReactNode, Suspense } from 'react'
import { Accessor, createResource, useCreateSignal, Resource, Setter } from '~/fix'
import { useLocation } from 'react-router-dom'

const useAction = <T,>(action: () => Promise<T>): [() => void, Resource<T>] => {
  const [source, setSource] = useCreateSignal(false)
  const [data] = createResource(source, action)
  const trigger = () => setSource(true)
  return [trigger, data]
}

const formatCurrency = (amount: number) => `$${(amount / 100).toFixed(amount % 100 === 0 ? 0 : 2)}`

type PrimeActivityProps = {
  dongleId: string
}

type PrimePlan = 'nodata' | 'data'

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

const Plan = (props: PlanProps) => {
  return props as unknown as ReactNode
}

const PlanSelector = (props: {
  plan: Accessor<PrimePlan | undefined>
  setPlan: Setter<PrimePlan | undefined>
  disabled?: boolean
  children?: ReactNode
}) => {
  const plans = createMemo<PlanProps[]>(() => {
    const p = props.children
    return (Array.isArray(p) ? p : [p]) as unknown[] as PlanProps[]
  })

  return (
    <div className="relative">
      <div className="flex w-full gap-2 xs:gap-4">
        {plans().map((plan) => (
          <ButtonBase
            className={clsx(
              'flex grow basis-0 flex-col items-center justify-center gap-2 rounded-lg p-2 text-center xs:p-4',
              'state-layer bg-tertiary text-on-tertiary transition before:bg-on-tertiary',
              props.plan() === plan.name && 'ring-4 ring-on-tertiary',
              plan.disabled && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => props.setPlan(plan.name)}
            disabled={plan.disabled || props.disabled}
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
  const [selectedPlan, setSelectedPlan] = useCreateSignal<PrimePlan>()

  const [device] = createResource(dongleId, getDevice)
  const [subscribeInfo] = createResource(dongleId, getSubscribeInfo)

  const search = useLocation().search
  const stripeCancelled = () => new URLSearchParams(search).has('stripe_cancelled')

  const [checkout, checkoutData] = useAction(async () => {
    const { url } = await getStripeCheckout(dongleId, subscribeInfo.data!.sim_id!, selectedPlan()!)
    if (url) {
      window.location.href = url
    }
  })

  const isLoading = subscribeInfo.loading || checkoutData.loading

  const [uiState] = createResource({ device: device.data, subscribeInfo: subscribeInfo.data, selectedPlan: selectedPlan() }, (source) => {
    if (!source.device || !source.subscribeInfo) return null

    let trialEndDate: number | null, trialClaimable: boolean
    if (source.selectedPlan === 'data') {
      trialEndDate = source.subscribeInfo.trial_end_data
      trialClaimable = !!trialEndDate
    } else if (source.selectedPlan === 'nodata') {
      trialEndDate = source.subscribeInfo.trial_end_nodata
      trialClaimable = !!trialEndDate
    } else {
      trialEndDate = null
      trialClaimable = Boolean(source.subscribeInfo.trial_end_data && source.subscribeInfo.trial_end_nodata)
    }

    let checkoutText: string
    if (source.selectedPlan) {
      checkoutText = trialClaimable ? 'Claim trial' : 'Go to checkout'
    } else {
      checkoutText = 'Select a plan'
      if (trialClaimable) checkoutText += ' to claim trial'
    }

    let chargeText: string = ''
    if (source.selectedPlan && trialClaimable) {
      chargeText = `Your first charge will be on ${formatDate(trialEndDate)}, then monthly thereafter.`
    }

    let disabledDataPlanText: ReactNode
    if (!source.device.eligible_features?.prime_data) {
      disabledDataPlanText = 'Standard plan is not available for your device.'
    } else if (!source.subscribeInfo.sim_id && source.subscribeInfo.device_online) {
      disabledDataPlanText = 'Standard plan not available, no SIM was detected. Ensure SIM is securely inserted and try again.'
    } else if (!source.subscribeInfo.sim_id) {
      disabledDataPlanText = 'Standard plan not available, device could not be reached. Connect device to the internet and try again.'
    } else if (!source.subscribeInfo.is_prime_sim || !source.subscribeInfo.sim_type) {
      disabledDataPlanText = 'Standard plan not available, detected a third-party SIM.'
    } else if (!['blue', 'magenta_new', 'webbing'].includes(source.subscribeInfo.sim_type)) {
      disabledDataPlanText = [
        'Standard plan not available, old SIM type detected, new SIM cards are available in the ',
        <a className="text-tertiary underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
          shop
        </a>,
      ]
    } else if (source.subscribeInfo.sim_usable === false && source.subscribeInfo.sim_type === 'blue') {
      disabledDataPlanText = [
        'Standard plan not available, SIM has been canceled and is therefore no longer usable, new SIM cards are available in the ',
        <a className="text-tertiary underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
          shop
        </a>,
      ]
    } else if (source.subscribeInfo.sim_usable === false) {
      disabledDataPlanText = [
        'Standard plan not available, SIM is no longer usable, new SIM cards are available in the ',
        <a className="text-tertiary underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
          shop
        </a>,
      ]
    }

    return {
      trialEndDate,
      trialClaimable,
      chargeText,
      checkoutText,
      disabledDataPlanText,
    }
  })

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

      {stripeCancelled() && (
        <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
          <Icon name="error" className="text-error" size="20" />
          Checkout cancelled
        </div>
      )}

      <PlanSelector plan={selectedPlan} setPlan={setSelectedPlan} disabled={isLoading()}>
        <Plan name="nodata" amount={1000} description="bring your own sim card" />
        <Plan
          name="data"
          amount={2400}
          description="including data plan, only offered in the U.S."
          disabled={uiState.data?.disabledDataPlanText}
        />
      </PlanSelector>

      {uiState.data?.disabledDataPlanText && (
        <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
          <Icon name="info" size="20" />
          {uiState.data.disabledDataPlanText}
        </div>
      )}

      {uiState.data?.checkoutText && (
        <Button color="tertiary" disabled={!selectedPlan()} loading={checkoutData.loading} onClick={checkout}>
          {uiState.data.checkoutText}
        </Button>
      )}

      {uiState.data?.chargeText && <p className="text-sm">{uiState.data.chargeText}</p>}
    </div>
  )
}

const PrimeManage = ({ dongleId }: { dongleId: string }) => {
  const stripeSessionId = () => new URLSearchParams(useLocation().search).get('stripe_success')

  const [stripeSession] = createQuery({
    source: () => {
      const source = [dongleId, stripeSessionId()]
      if (source.some((param) => !param)) return null
      return source as [string, string]
    },
    fetcher: ([dongleId, stripeSessionId]) => getStripeSession(dongleId, stripeSessionId),
    refetchInterval: 10_000,
    stopCondition: (session) => session?.payment_status === 'paid',
  })

  // TODO: we should wait for the session to be paid before fetching subscription
  const [subscription] = createQuery({
    source: () => dongleId,
    fetcher: getSubscriptionStatus,
    retryInterval: 10_000,
  })

  const [cancelDialog, setCancelDialog] = useCreateSignal(false)
  const [cancel, cancelData] = useAction(() => cancelSubscription(dongleId))
  const [update, updateData] = useAction(async () => {
    const { url } = await getStripePortal(dongleId)
    if (url) {
      window.location.href = url
    }
  })
  const loading = () => subscription.loading || cancelData.loading || updateData.loading || stripeSession.loading

  createEffect(() => {
    if (cancelData.state !== 'ready') return
    setTimeout(() => window.location.reload(), 5000)
  })

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
        {stripeSession.state === 'errored' ? <div className="flex gap-2 rounded-sm bg-on-error-container p-2 text-sm font-semibold text-error-container">
          <Icon name="error" size="20" />
          Unable to check payment status: {stripeSession.error}
        </div> :
          stripeSession()?.payment_status ?
            { paymentStatus === 'unpaid' ?
              <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
                <Icon name="payments" size="20" />
                Waiting for confirmed payment...
              </div> :

              (paymentStatus === 'paid' && !subscription()) ?
                <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
                  <Icon className="animate-spin" name="autorenew" size="20" />
                  Processing subscription...
                </div>
                :
                (paymentStatus === 'paid' && subscription()) ?
                  <div className="flex gap-2 rounded-sm bg-tertiary-container p-2 text-sm text-on-tertiary-container">
                    <Icon name="check" size="20" />
                    <div className="flex flex-col gap-2">
                      <p className="font-semibold">comma prime activated</p>
                      {subscription()?.is_prime_sim && " Connectivity will be enabled as soon as activation propogates to your local cell tower. Rebooting your device may help."}
                    </div>
                  </div> : <></>}
        : <></>}

        {cancelData.state === 'errored' ? <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
          <Icon className="text-error" name="error" size="20" />
          Failed to cancel subscription: {cancelData.error}
        </div> : cancelData.state === 'ready' ?
          <div className="flex gap-2 rounded-sm bg-surface-container p-2 text-sm text-on-surface">
            <Icon name="check" size="20" />
            Subscription cancelled
          </div> : <></>}

        {subscription.state === 'errored' ?
          <>Unable to fetch subscription details: {subscription.error}</> :

          subscription() ?
            <>
              <div className="flex list-none flex-col">
                <li>Plan: {PrimePlanName[subscription.plan as PrimePlan] ?? 'unknown'}</li>
                <li>Amount: {formatCurrency(subscription.amount)}</li>
                <li>Joined: {formatDate(subscription.subscribed_at)}</li>
                <li>Next payment: {formatDate(subscription.next_charge_at)}</li>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button color="error" disabled={loading()} loading={cancelData.loading} onClick={() => setCancelDialog(true)}>
                  Cancel subscription
                </Button>
                <Button color="secondary" disabled={loading()} loading={updateData.loading} onClick={update}>
                  Update payment method
                </Button>
              </div>
            </>
            : <></>}
      </Suspense>

      {cancelDialog() && <div
        className="bg-scrim/10 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
        onClick={() => setCancelDialog(false)}
      >
        <div className="flex size-full flex-col gap-4 bg-surface-container p-6 sm:h-auto sm:max-w-lg sm:rounded-lg sm:shadow-lg">
          <h2 className="text-lg">Cancel subscription</h2>
          <p className="text-sm">Are you sure you want to cancel your subscription?</p>
          <div className="mt-4 flex flex-wrap justify-stretch gap-4">
            <Button
              color="error"
              disabled={loading()}
              loading={cancelData.loading}
              onClick={() => {
                cancel()
                setCancelDialog(false)
              }}
            >
              Yes, cancel subscription
            </Button>
            <Button color="secondary" disabled={loading()} onClick={() => setCancelDialog(false)}>
              No, keep subscription
            </Button>
          </div>
        </div>
      </div>}
    </div>
  )
}

const DeviceSettingsForm = ({ dongleId, device }: { dongleId: string; device: Resource<Device> }) => {
  const [deviceName] = createResource(device, getDeviceName)

  const [unpair, unpairData] = useAction(async () => {
    const { success } = await unpairDevice(dongleId)
    if (success) window.location.href = window.location.origin
  })

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg">{deviceName.data}</h2>
      {unpairData.error && (
        <div className="flex gap-2 rounded-sm bg-surface-container-high p-2 text-sm text-on-surface">
          <Icon className="text-error" name="error" size="20" />
          {unpairData.error?.message ?? unpairData.error?.cause ?? unpairData.error ?? 'Unknown error'}
        </div>
      )}
      <Button color="error" leading={<Icon name="delete" />} onClick={unpair} disabled={unpairData.loading}>
        Unpair this device
      </Button>
    </div>
  )
}

export const SettingsActivity = ({ dongleId }: PrimeActivityProps) => {
  const [device] = createResource(dongleId, getDevice)

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
          {device.data?.prime === false ? (
            <PrimeCheckout dongleId={dongleId} />
          ) : device.data?.prime === true ? (
            <PrimeManage dongleId={dongleId} />
          ) : (
            <></>
          )}
        </Suspense>
      </div>
    </>
  )
}
