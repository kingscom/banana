import Dashboard from '@/components/Dashboard'
import AuthWrapper from '@/components/AuthWrapper'

export default function Home() {
  return (
    <AuthWrapper>
      <Dashboard />
    </AuthWrapper>
  )
}