import { loadSupport, loadTestMode, fetchFixtures, getOffsetDate } from '@/lib/api'
import App from '@/components/App'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [support, testMode, fixtures] = await Promise.all([
    loadSupport(),
    loadTestMode(),
    fetchFixtures(getOffsetDate(0)),
  ])

  return (
    <App
      initialFixtures={fixtures ?? []}
      support={support ?? { whatsapp:'', telegram:'', email:'', adsense_client:'', adsense_slot:'' }}
      testMode={testMode?.testMode ?? false}
    />
  )
}
