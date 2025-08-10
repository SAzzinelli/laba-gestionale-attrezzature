import express from 'express'
import { listInventario, getInventario, addInventario, updateInventario, delInventario, summary } from '../models/inventario.js'
const router = express.Router()
router.get('/', (_,res)=> res.json(listInventario()))
router.get('/summary', (_,res)=> res.json(summary()))
router.get('/:id', (req,res)=>{ const r=getInventario(+req.params.id); if(!r) return res.status(404).json({error:'Not found'}); res.json(r) })
router.post('/', (req,res)=>{ try{ res.status(201).json(addInventario(req.body)) }catch(e){ res.status(400).json({error:e.message}) } })
router.put('/:id', (req,res)=>{ try{ res.json(updateInventario(+req.params.id, req.body)) }catch(e){ res.status(400).json({error:e.message}) } })
router.delete('/:id', (req,res)=> res.json(delInventario(+req.params.id)))
export default router
