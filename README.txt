========================================
  Minecraft Bedrock AFK Bot
========================================

WHAT IT DOES
------------
- Joins your Bedrock server and stays AFK
- Jumps every 4 seconds to keep chunks loaded
- Automatically accepts resource packs / add-ons
- Auto-reconnects if kicked or disconnected
- Shows chat messages in the console

========================================
  OPTION A — HOST 24/7 FREE ON RAILWAY
  (runs even when your PC is off)
========================================

1. Make a free account at:  https://railway.app

2. Make a free account at:  https://github.com
   (needed to upload your files)

3. Go to github.com and create a new repository
   Call it anything, e.g. "minecraft-bot"
   Set it to Public

4. Upload ALL files in this folder to that repository
   (drag and drop them into the GitHub file uploader)

5. Go to railway.app → New Project → Deploy from GitHub repo
   Pick your minecraft-bot repository

6. Once deployed, click your project → Variables tab
   Add these variables:
     SERVER_HOST     = shinobu00.aternos.me
     SERVER_PORT     = 44224
     BOT_USERNAME    = dihbergo
     OFFLINE_MODE    = true
     JUMP_INTERVAL_MS = 4000

7. Click Deploy — the bot will start and run 24/7!

Railway gives you $5 free credit per month which is enough
to run a small bot like this all month for free.

========================================
  OPTION B — RUN ON YOUR OWN PC
========================================

Requirements: Node.js 18+ from https://nodejs.org

Steps:
1. Open a terminal in this folder
2. Run: npm install
3. Windows: double-click start.bat
   Mac/Linux: run ./start.sh

========================================
  SETTINGS
========================================

Change these in Railway's Variables tab (Option A)
or inside start.bat / start.sh (Option B):

  SERVER_HOST       your server IP or domain
  SERVER_PORT       server port (default: 19132)
  BOT_USERNAME      name shown in-game
  OFFLINE_MODE      true  = no Microsoft login
                    false = requires Microsoft account
  JUMP_INTERVAL_MS  how often to jump (4000 = 4 seconds)

Press Ctrl+C to stop (Option B only).

========================================
