import { Library } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { PreparationStart } from '@/components/preparation/start'
import { TodayTraining } from '@/components/dashboard/today-training'
import { DaySummary } from '@/components/dashboard/day-summary'
import { LateStartWarning } from '@/components/dashboard/late-start'
import type {getPreparation} from '@/lib/supabase/preparation'

export async function DashboardView({libraryEmpty,preparation}:{libraryEmpty:boolean;preparation:Awaited<ReturnType<typeof getPreparation>>}) {
  if (libraryEmpty&&!preparation) return <EmptyState icon={Library} title="В библиотеке пока нет материалов" body="Выбери цель подготовки. Когда появятся материалы, они войдут в твой план." action={{href:'/plan/settings',label:'Настроить подготовку'}}/>
  return preparation?<div className="space-y-5"><LateStartWarning/><TodayTraining preparation={preparation}/><DaySummary/></div>:<div className="space-y-5"><LateStartWarning/><PreparationStart/></div>
}
