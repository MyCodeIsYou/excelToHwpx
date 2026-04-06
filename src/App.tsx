import ExcelToHwpxPage from './pages/ExcelToHwpxPage'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h2>ExcelToHwpx</h2>
      </header>
      <main>
        <ExcelToHwpxPage />
      </main>
      <footer className="app-footer">
        <p>Excel to HWPX Converter &copy; 2026</p>
      </footer>
    </div>
  )
}

export default App
