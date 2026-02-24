import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { CategoriesProvider } from './context/CategoriesContext'
import './styles/app.styles.scss'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CategoriesProvider>
          <App />
        </CategoriesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
