'use client'
import {useActionState} from 'react'
import {startPreparationMock} from '@/app/(app)/plan/actions'
import {Button} from '@/components/ui/button'
export function SessionMockStart({step,scope}:{step:string;scope:string}) {
 const [result,action,pending]=useActionState(startPreparationMock,null)
 return <form action={action} className="mt-4"><input type="hidden" name="step" value={step}/><input type="hidden" name="scope" value={scope}/><Button type="submit" disabled={pending}>{pending?'Открываем…':'Начать пробник'}</Button>{result?.error?<p role="alert" className="mt-2 text-sm">{result.error}</p>:null}</form>
}
