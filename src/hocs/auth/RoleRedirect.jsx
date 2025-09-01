import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

export default function RoleRedirect(){
  const user = useSelector(s=>s.auth.user)
  if(!user) return <Navigate to="/login" replace />
  if(user.role === 'artist') return <Navigate to="/publicar" replace />
  return <Navigate to="/comprar" replace />
}
