import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import inventarioRouter from './routes/inventario.js'
import prestitiRouter from './routes/prestiti.js'
import categorieRouter from './routes/categorie.js'
import riparazioniRouter from './routes/riparazioni.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/api/health', (_,res)=>res.json({ ok:true, version:'4.1.0' }))
app.use('/api/inventario', inventarioRouter)
app.use('/api/prestiti', prestitiRouter)
app.use('/api/categorie', categorieRouter)
app.use('/api/riparazioni', riparazioniRouter)

// serve frontend build if built
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const staticDir = path.join(__dirname, '..', 'frontend', 'dist')
app.use(express.static(staticDir))
app.get('*', (req,res)=>{
  try{ res.sendFile(path.join(staticDir, 'index.html')) }
  catch{ res.status(404).send('API running. Build frontend to serve UI.') }
})

app.listen(PORT, ()=>console.log(`API on http://127.0.0.1:${PORT}`))
