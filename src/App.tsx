import HouseCanvas from './components/HouseCanvas'
import { HouseCanvasProvider } from './context/houseCanvasContext'
import Sidebar from './sidebar'

function App() {
  return (
    <HouseCanvasProvider>
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
        <HouseCanvas />
        <Sidebar />
      </div>
    </HouseCanvasProvider>
  )
}

export default App
