// Downloads the canvas as it was last drawn, as a PNG at device resolution. The canvas
// itself is transparent (the page background shows through), so the copy gets
// `backgroundColor` underneath.
export const saveCanvasScreenshot = (canvas: HTMLCanvasElement, backgroundColor: string) => {
    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    const ctx = snapshot.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, snapshot.width, snapshot.height);
    ctx.drawImage(canvas, 0, 0);

    snapshot.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        // e.g. overhouse-2026-10-13-14-05-09.png (local time)
        const now = new Date();
        const timestamp = [
            now.getFullYear(),
            now.getMonth() + 1,
            now.getDate(),
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
        ]
            .map((part) => String(part).padStart(2, "0"))
            .join("-");
        link.download = `overhouse-${timestamp}.png`;
        link.click();
        // Revoked after the click has been handled, so the download can still read it.
        window.setTimeout(() => URL.revokeObjectURL(url));
    }, "image/png");
};
