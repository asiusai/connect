// import { LinearProgress } from './material/LinearProgress'
// import { Icon, type IconName } from './material/Icon'
// import { IconButton } from './material/IconButton'
// import { StatisticBar } from './StatisticBar'
// import { Button } from '../components/material/Button'
// import type { AthenaOfflineQueueResponse, UploadFilesToUrlsRequest, UploadQueueItem } from '../api/types'
// import { cancelUpload, getUploadQueue } from '../api/file'

// export const queries = {
//   prefix: ['upload_queue'],

//   online: () => [...queries.prefix, 'online'],
//   onlineForDongle: (dongleId: string) => [...queries.online(), dongleId],
//   getOnline: (dongleId: string) => queryOptions({ queryKey: queries.onlineForDongle(dongleId), queryFn: () => getUploadQueue(dongleId) }),
//   offline: () => [...queries.prefix, 'offline'],
//   offlineForDongle: (dongleId: string) => [...queries.offline(), dongleId],
//   getOffline: (dongleId: string) =>
//     queryOptions({ queryKey: queries.offlineForDongle(dongleId), queryFn: () => getAthenaOfflineQueue(dongleId) }),
//   cancelUpload: (dongleId: string) => {
//     const queryClient = useQueryClient()
//     return useMutation(() => ({
//       mutationFn: (ids: string[]) => cancelUpload(dongleId, ids),
//       onSettled: () => queryClient.invalidateQueries({ queryKey: queries.onlineForDongle(dongleId) }),
//     }))
//   },
// }

// const mapOfflineQueueItems = (data: AthenaOfflineQueueResponse): UploadQueueItem[] =>
//   data
//     .filter((item) => item.method === 'uploadFilesToUrls')
//     .flatMap((item) =>
//       (item.params as UploadFilesToUrlsRequest).files_data.map((file) => ({
//         ...file,
//         path: file.fn,
//         created_at: 0,
//         current: false,
//         id: '',
//         progress: 0,
//         retry_count: 0,
//       })),
//     )

// interface UploadQueueItemWithAttributes extends UploadQueueItem {
//   route: string
//   segment: number
//   filename: string
//   isFirehose: boolean
// }

// const populateAttributes = (item: UploadQueueItem): UploadQueueItemWithAttributes => {
//   const parsed = new URL(item.url)
//   const parts = parsed.pathname.split('/')
//   if (parsed.hostname === 'upload.commadotai.com') {
//     return { ...item, route: parts[2], segment: parseInt(parts[3], 10), filename: parts[4], isFirehose: true }
//   }
//   return { ...item, route: parts[3], segment: parseInt(parts[4], 10), filename: parts[5], isFirehose: false }
// }

// const UploadQueueRow = (props: { cancel: (ids: string[]) => void; item: UploadQueueItemWithAttributes }) => {
//   const item = () => props.item
//   const cancel = () => props.cancel([item().id])
//   return (
//     <div className="flex flex-col">
//       <div className="flex items-center justify-between flex-wrap mb-1 gap-x-4 min-w-0">
//         <div className="flex items-center min-w-0 flex-1">
//           <Icon className="text-on-surface-variant flex-shrink-0 mr-2" name={item().isFirehose ? 'local_fire_department' : 'person'} />
//           <div className="flex min-w-0 gap-1">
//             <span className="text-xs font-mono truncate text-on-surface">{`${item().route}/${item().segment} ${item().filename}`}</span>
//           </div>
//         </div>
//         <div className="flex items-center gap-0.5 flex-shrink-0 justify-end">
//           {!item().id || item().progress !== 0 ? (
//             <span className="text-xs font-mono whitespace-nowrap pr-[0.5rem]">
//               {item().id ? `${Math.round(item().progress * 100)}%` : 'Offline'}
//             </span>
//           ) : (
//             <IconButton size="20" name="close" onClick={cancel} />
//           )}
//         </div>
//       </div>
//       <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
//         <LinearProgress progress={item().progress} color={Math.round(item().progress * 100) === 100 ? 'tertiary' : 'primary'} />
//       </div>
//     </div>
//   )
// }

// const StatusMessage = (props: { iconClass?: string; icon: IconName; message: string }) => (
//   <div className="flex items-center gap-2">
//     <Icon name={props.icon} className={props.iconClass} />
//     <span className="text-md">{props.message}</span>
//   </div>
// )

// export const UploadQueue = (props: { dongleId: string }) => {
//   return null
//   const onlineQueue = useQuery(() => queries.getOnline(props.dongleId))
//   const offlineQueue = useQuery(() => queries.getOffline(props.dongleId))
//   const cancel = createMemo(() => queries.cancelUpload(props.dongleId))

//   const [items, setItems] = createStore<UploadQueueItemWithAttributes[]>([])

//   createEffect(() => {
//     const online = onlineQueue.isSuccess ? (onlineQueue.data?.result ?? []) : []
//     const offline = offlineQueue.isSuccess ? mapOfflineQueueItems(offlineQueue.data ?? []) : []
//     const sorted = [...online, ...offline].map(populateAttributes).sort((a, b) => b.progress - a.progress)
//     setItems(reconcile(sorted))
//   })

//   const cancelAll = () => {
//     const ids = items.filter((item) => item.id).map((item) => item.id)
//     if (ids.length === 0) return
//     cancel().mutate(ids)
//   }

//   return (
//     <div className="flex flex-col gap-4 bg-surface-container-lowest">
//       <div className="flex p-4 justify-between items-center border-b-2 border-b-surface-container-low">
//         <StatisticBar statistics={[{ label: 'Queued', value: () => items.length }]} />
//         <Button color="text" leading={<Icon name="clear_all" />} onClick={cancelAll}>
//           Cancel all
//         </Button>
//       </div>
//       <div className="relative h-[calc(4*3rem)] sm:h-[calc(6*3rem)] flex justify-center items-center text-on-surface-variant">
//         {!onlineQueue.isFetched ? (
//           <StatusMessage iconClass="animate-spin" icon="autorenew" message="Waiting for device to connect..." />
//         ) : onlineQueue.isFetched && !onlineQueue.isSuccess && items.length === 0 ? (
//           <StatusMessage icon="error" message="Device offline" />
//         ) : onlineQueue.isFetched && onlineQueue.isSuccess && items.length === 0 ? (
//           <StatusMessage icon="check" message="Nothing to upload" />
//         ) : (
//           <div className="absolute inset-0 bottom-4 flex flex-col gap-2 px-4 overflow-y-auto">
//             {items.map((item) => (
//               <UploadQueueRow cancel={cancel().mutate} item={item} />
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }
