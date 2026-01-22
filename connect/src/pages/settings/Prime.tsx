import { type PrimePlan } from '../../../../shared/types'
import { formatCurrency, formatDate } from '../../utils/format'
import { ButtonBase } from '../../components/ButtonBase'
import { Icon } from '../../components/Icon'
import { ReactNode, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../../api'
import { useRouteParams } from '../../utils/hooks'
import { cn } from '../../../../shared/helpers'

type PlanProps = { name: PrimePlan; amount: number; description: string; disabled?: boolean }
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
          className={cn(
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
  const { dongleId } = useRouteParams()

  const [selectedPlan, setSelectedPlan] = useState<PrimePlan | undefined>()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })

  const [subscribeInfo] = api.prime.info.useQuery({ query: { dongle_id: dongleId } })

  const search = useLocation().search
  const stripeCancelled = new URLSearchParams(search).has('stripe_cancelled')
  const checkout = api.prime.getCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url
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
  if (selectedPlan && trialClaimable && trialEndDate) {
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
      <a key="1" className="text-blue-400 underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
        shop
      </a>,
    ]
  } else if (subscribeInfo.sim_usable === false && subscribeInfo.sim_type === 'blue') {
    disabledDataPlanText = [
      'Standard plan not available, SIM has been canceled and is therefore no longer usable, new SIM cards are available in the ',
      <a key="2" className="text-blue-400 underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
        shop
      </a>,
    ]
  } else if (subscribeInfo.sim_usable === false) {
    disabledDataPlanText = [
      'Standard plan not available, SIM is no longer usable, new SIM cards are available in the ',
      <a key="3" className="text-blue-400 underline" href="https://comma.ai/shop/comma-prime-sim" target="_blank" rel="noopener">
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
          className={cn(
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
  const { dongleId } = useRouteParams()
  const [stripeSession] = api.prime.getSession.useQuery({
    query: { dongle_id: dongleId, session_id: id },
    enabled: !!id,
    refetchInterval: 10_000,
  })
  const [subscription] = api.prime.status.useQuery({ query: { dongle_id: dongleId }, refetchInterval: 10_000 })
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
  const { dongleId } = useRouteParams()

  const stripeSessionId = new URLSearchParams(useLocation().search).get('stripe_success')!

  const [subscription, { refetch }] = api.prime.status.useQuery({ query: { dongle_id: dongleId } })
  const [cancelDialog, setCancelDialog] = useState(false)

  const cancel = api.prime.cancel.useMutation({ onSuccess: () => refetch() })
  const [portal] = api.prime.getPortal.useQuery({ query: { dongle_id: dongleId } })

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
        <div className="bg-black/60 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" onClick={() => setCancelDialog(false)}>
          <div className="flex w-full flex-col gap-4 bg-background p-6 rounded-2xl shadow-2xl max-w-sm" onClick={(e) => e.stopPropagation()}>
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

export const Prime = () => {
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })

  if (!device) return null
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold px-2">comma prime</h2>
      {!device.prime ? <PrimeCheckout /> : <PrimeManage />}
    </div>
  )
}
