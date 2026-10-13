import { useRef, useState } from "react";
import styles from "./App.module.css";
import Actions from "./components/Actions";
import ClickToolbar from "./components/ClickToolbar";
import HouseCanvas, { type HouseCanvasHandle } from "./components/HouseCanvas";
import OverloadNotice from "./components/OverloadNotice";
import PlayBar from "./components/PlayBar";
import SettingsPanel from "./components/SettingsPanel";
import { HouseCanvasProvider } from "./context/HouseCanvasProvider";

function App() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const canvasRef = useRef<HouseCanvasHandle | null>(null);

    return (
        <HouseCanvasProvider>
            <main className={styles.layout}>
                <HouseCanvas ref={canvasRef} />
                <PlayBar />
                <OverloadNotice />
                <div className={styles.topBar}>
                    <SettingsPanel isOpen={isSettingsOpen} />
                    <ClickToolbar />
                    <button
                        type="button"
                        className={styles.settingsToggle}
                        aria-label="Settings"
                        aria-expanded={isSettingsOpen}
                        aria-controls="settings"
                        onClick={() => setIsSettingsOpen((open) => !open)}
                    >
                        <svg viewBox="0 0 20 20" aria-hidden="true" className={styles.icon}>
                            <path d="M3 5h14M3 10h14M3 15h14" />
                            <circle cx="7" cy="5" r="1.8" />
                            <circle cx="13" cy="10" r="1.8" />
                            <circle cx="8" cy="15" r="1.8" />
                        </svg>
                        <span className={styles.text}>Settings</span>
                    </button>
                    <Actions
                        onFit={() => canvasRef.current?.fit()}
                        onResetView={() => canvasRef.current?.resetView()}
                        onScreenshot={() => canvasRef.current?.saveScreenshot()}
                    />
                </div>
            </main>
        </HouseCanvasProvider>
    );
}

export default App;
