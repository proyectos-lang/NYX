import { redirect } from 'next/navigation'

export default function PanelRaiz() {
  // La bandeja de pedidos es lo primero que se mira cada manana.
  redirect('/panel/pedidos')
}
