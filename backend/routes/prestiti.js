import express from 'express'
import { listPrestiti, addPrestito, updatePrestito, delPrestito, getPrestito } from '../models/prestiti.js'
const router = express.Router()
router.get('/', (_,res)=> res.json(listPrestiti()))
router.get('/:id', (req,res)=>{ const r=getPrestito(+req.params.id); if(!r) return res.status(404).json({error:'Not found'}); res.json(r) })
router.post('/', (req,res)=>{ try{ res.status(201).json(addPrestito(req.body)) }catch(e){ res.status(400).json({error:e.message}) } })
router.put('/:id', (req,res)=>{ try{ res.json(updatePrestito(+req.params.id, req.body)) }catch(e){ res.status(400).json({error:e.message}) } })
router.delete('/:id', (req,res)=> res.json(delPrestito(+req.params.id)))
export default router
