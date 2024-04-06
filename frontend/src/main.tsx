import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Login, { loader as loginLoader } from './routes/login'
import './index.css'

const router = createBrowserRouter([
  { path: '/', element: <p>React Router, Introduced</p> },
  { path: '/login', element: <Login />, loader: loginLoader },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
