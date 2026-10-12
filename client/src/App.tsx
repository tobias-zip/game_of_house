import { useState } from "react";
import styles from "./App.module.css";
import ClickToolbar from "./components/ClickToolbar";
import HouseCanvas from "./components/HouseCanvas";
import OverloadNotice from "./components/OverloadNotice";
import PlayBar from "./components/PlayBar";
import Sidebar from "./components/Sidebar";
import { HouseCanvasProvider } from "./context/HouseCanvasProvider";
import { useHouseCanvas } from "./context/useHouseCanvas";
import { findPresetForRules } from "./rules";

// Wide screens start with the settings open; phones start with the canvas only.
const NARROW_SCREEN_QUERY = "(max-width: 700px)";

function TitleBlock() {
    const { sideBehaviorByCoverage } = useHouseCanvas();
    const preset = findPresetForRules(sideBehaviorByCoverage);

    return (
        <header className={styles.titleBlock}>
            <h1 className={styles.title}>Overhouse</h1>
            <p className={styles.subtitle}>{preset ? preset.name : "Custom rules"}</p>
        </header>
    );
}

function App() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(
        () => !window.matchMedia(NARROW_SCREEN_QUERY).matches,
    );

    return (
        <HouseCanvasProvider>
            <main className={`${styles.layout} ${isSettingsOpen ? styles.settingsOpen : ""}`}>
                <HouseCanvas />
                <TitleBlock />
                <ClickToolbar />
                {!isSettingsOpen && (
                    <button
                        type="button"
                        className={styles.settingsToggle}
                        aria-expanded={false}
                        aria-controls="settings"
                        onClick={() => setIsSettingsOpen(true)}
                    >
                        Settings
                    </button>
                )}
                <PlayBar />
                <OverloadNotice />
                <Sidebar isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </main>
        </HouseCanvasProvider>
    );
}

export default App;
