import { Navigate } from 'react-router-dom'

/** Legacy route — leave + calendar + requests live on `/leave` */
export default function LeaveCalendarPage() {
  return <Navigate to="/leave" replace />
}
