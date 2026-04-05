import { useContext } from 'react'
import { ToastContext } from '@/hooks/toastContext'

export function useToast() {
  return useContext(ToastContext)
}
