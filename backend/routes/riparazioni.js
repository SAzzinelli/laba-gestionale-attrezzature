import express from 'express'
import { listRip, addRip, updateRip, delRip, getRip } from '../models/riparazioni.js'
const router = express.Router()
router.get('/', (_,res)=> res.json(listRip()))
router.get('/:id', (req,res)=>{ const r=getRip(+req.params.id); if(!r) return res.status(404).json({error:'Not found'}); res.json(r) })
router.post('/', (req,res)=>{ try{ res.status(201).json(addRip(req.body)) }catch(e){ res.status(400).json({error:e.message}) } })
router.put('/:id', (req,res)=>{ try{ res.json(updateRip(+req.params.id, req.body)) }catch(e){ res.status(400).json({error:e.message}) } })
router.delete('/:id', (req,res)=> res.json(delRip(+req.params.id)))
export default router
