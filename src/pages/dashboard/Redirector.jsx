import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

export default function Redirector(){
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  useEffect(()=>{
    if(!user){
      navigate('/login', { replace: true })
      return
    }
    // NUEVO: admin -> /admin
    if (user.role === 'admin'){
      navigate('/admin', { replace: true })
      return
    }
    // resto igual que antes
    if (user.role === 'artist'){
      navigate('/mis-obras', { replace: true })
    }else{
      navigate('/comprar', { replace: true })
    }
  }, [user, navigate])

  return null
}
