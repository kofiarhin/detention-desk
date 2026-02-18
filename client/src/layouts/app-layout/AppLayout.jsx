import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/sidebar/Sidebar'
import Topbar from '../../components/topbar/Topbar'
import './app-layout.styles.scss'

const AppLayout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout-content-wrap">
        <Topbar />
        <main className="app-layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
