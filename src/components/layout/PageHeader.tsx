import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  back?: boolean | string
  action?: React.ReactNode
}

export default function PageHeader({ title, back, action }: PageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (typeof back === 'string') {
      navigate(back)
    } else {
      navigate(-1)
    }
  }

  return (
    <header
      className="sticky top-0 z-30 glass border-b border-[var(--color-border)]"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div className="flex items-center h-14 px-4 gap-3">
        {back !== undefined && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-[var(--color-text-muted)] active-scale"
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <h1 className="flex-1 text-lg font-bold text-[var(--color-text)] truncate">{title}</h1>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
