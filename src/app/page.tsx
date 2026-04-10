// Server Component — owns the route segment config.
// All interactive logic lives in QueueApp (client component).
export const dynamic = 'force-dynamic'

import QueueApp from './_components/QueueApp'

export default function Page() {
  return <QueueApp />
}
