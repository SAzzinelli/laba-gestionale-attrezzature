import React, { useEffect } from 'react'

export default function Modal({ title, children, onClose, footer }){
  useEffect(()=>{
    const onKey=(e)=>{
      if(e.key==='Escape') onClose?.()
      if(e.key==='Enter'){
        const btn = document.querySelector('.modal .modal-footer .btn-primary')
        if(btn) btn.click()
      }
    }
    document.addEventListener('keydown', onKey)
    return ()=> document.removeEventListener('keydown', onKey)
  },[onClose])

  return (
    <div className="modal-overlay flex items-center justify-center" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  )
}
