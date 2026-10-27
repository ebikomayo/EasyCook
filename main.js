const { app, BrowserWindow } = require("electron");

function createWindow() {
    const win = new BrowserWindow({ width: 1000, height: 700 });
    win.loadFile("index.html");     // the first page to open
}

app.whenReady().then(createWindow);

// quit app when all windows are closed 
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});