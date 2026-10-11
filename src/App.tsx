import HouseCanvas from './components/HouseCanvas'
import { HouseCanvasProvider } from './context/HouseCanvasProvider'
import Sidebar from './components/Sidebar'
import styles from './App.module.css'

function App() {
  return (
    <HouseCanvasProvider>
      <div className={styles.layout}>
        <HouseCanvas />
        <Sidebar />
      </div>
    </HouseCanvasProvider>
  )
}

export default App
