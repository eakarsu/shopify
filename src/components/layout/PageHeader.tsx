import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  children?: React.ReactNode
}

export function PageHeader({ title, description, action, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {action && (
          action.href ? (
            <Button asChild>
              <Link href={action.href}>
                <Plus className="mr-2 h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>
              <Plus className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          )
        )}
      </div>
    </div>
  )
}
