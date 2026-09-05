import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ModeProvider } from './context/ModeContext'
import { ChatProvider } from './context/ChatContext'
import { DashboardLayout } from './layouts/DashboardLayout'
import { CommandCenter } from './pages/CommandCenter'
import { ThreatIntel } from './pages/ThreatIntel'
import { PayloadLab } from './pages/PayloadLab'
import { CodeAuditor } from './pages/CodeAuditor'
import { Reports } from './pages/Reports'

function App() {
  return (
    <BrowserRouter>
      <ModeProvider>
        <ChatProvider>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route index element={<CommandCenter />} />
              <Route path="threat-intel" element={<ThreatIntel />} />
              <Route path="payload-lab" element={<PayloadLab />} />
              <Route path="code-auditor" element={<CodeAuditor />} />
              <Route path="reports" element={<Reports />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ChatProvider>
      </ModeProvider>
    </BrowserRouter>
  )
}

export default App
