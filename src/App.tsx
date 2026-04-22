import HouseCanvas from './components/HouseCanvas'
import { HouseCanvasProvider } from './context/HouseCanvasProvider'
import Sidebar from './components/Sidebar'

function App() {
  return (
    <HouseCanvasProvider>
      <div
        style={{
          display: 'flex',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        <HouseCanvas />
        <Sidebar />
      </div>
    </HouseCanvasProvider>
  )
}

export default App
