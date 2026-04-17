# Weird Antioch Prototype

This is a small browser game prototype.

You do **not** need to know GitHub or coding to open it.

## Easiest Way To Open It

### 1. Install Node.js

- Open this website:
  [https://nodejs.org/](https://nodejs.org/)
- Download the **LTS** version.
- Run the installer.
- Keep clicking `Next` until it is finished.
- If it asks for permission, click `Yes`.

### 2. Download the project from GitHub

- Open the project page:
  [https://github.com/zaphoid/Initial-Weird-Antioch-prototype](https://github.com/zaphoid/Initial-Weird-Antioch-prototype)
- Near the top of the page, click the green `Code` button.
- Click `Download ZIP`.

### 3. Find the ZIP file on your computer

- Open `File Explorer`.
- Click `Downloads`.
- Look for a file named something like:
  `Initial-Weird-Antioch-prototype-main.zip`

### 4. Extract the ZIP file

- Right-click the ZIP file.
- Click `Extract All...`
- Choose where you want to put it.

Good example:
- `Documents`
- or `Desktop`

If you want to keep things organized, make a folder first:
- Open `Documents`
- Right-click empty space
- Click `New`
- Click `Folder`
- Name it something like:
  `Antioch Game`

Then extract the ZIP there.

When it finishes, you should have a normal folder, not a ZIP file.

Example:
- `Documents\Antioch Game\Initial-Weird-Antioch-prototype-main`

### 5. Open the project folder

- Open the extracted folder.
- You should see files like:
  - `package.json`
  - `start-weird-antioch.bat`
  - `src`

If you do **not** see those, you are probably still inside the ZIP or in the wrong folder.

### 6. Start the game

- Find:
  `start-weird-antioch.bat`
- Double-click it.

A black window should open.

### 7. Wait

The first time may take a minute or two.

The black window is doing setup.

Do **not** close it.

### 8. Open the game in your browser

After it starts, the black window will show a web address.

It will usually look like this:

`http://localhost:5173/`

- Open Chrome, Edge, or Firefox
- Click the address bar
- Type or paste the address
- Press `Enter`

The game should open in your browser.

## If Double-Clicking The BAT File Does Not Work

Use these steps instead.

### 1. Open the project folder

- Open `File Explorer`
- Go to your extracted project folder

Example:
- `Documents\Antioch Game\Initial-Weird-Antioch-prototype-main`

### 2. Open PowerShell in that folder

There are two easy ways:

#### Option A

- Click the folder path bar at the top of File Explorer
- Type:
  `powershell`
- Press `Enter`

#### Option B

- Right-click inside the folder
- Click `Open in Terminal`
  or `Open PowerShell window here`

### 3. Type these commands one at a time

```powershell
npm install
npm run dev
```

### 4. Wait for the web address

You should see a local address, usually:

`http://localhost:5173/`

Open that in your web browser.

## Controls

- `WASD` or arrow keys = move
- `E` = interact
- `Q` = quest board
- `F` = search pulse in archive spaces
- `F1` = debug panel

## If Something Goes Wrong

### Problem: `npm` is not recognized

This usually means Node.js was not installed yet, or the install did not finish correctly.

Fix:
- Install Node.js from [https://nodejs.org/](https://nodejs.org/)
- Then close and reopen PowerShell

### Problem: nothing happens when opening the BAT file

Fix:
- Right-click `start-weird-antioch.bat`
- Click `Run as administrator`

If that still does not work, use the PowerShell steps above.

### Problem: you cannot find the folder again later

Use File Explorer search and search for:

`start-weird-antioch.bat`

or

`package.json`

That should help you find the project folder again.

### Problem: the black window closes too fast

Use the PowerShell method instead of double-clicking the BAT file.

## Important

- Keep the black terminal window open while the game is running.
- If you close it, the game stops.
