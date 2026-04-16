import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

/**
 * Layout wraps every authenticated page.
 * It manages the mobile sidebar open/close state and passes it down.
 */
export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-layout">
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="page-content fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
