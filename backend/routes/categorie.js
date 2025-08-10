import express from 'express'
import { listCategorie, addCategoria } from '../models/categorie.js'
const router = express.Router()
router.get('/', (_,res)=> res.json(listCategorie()))
router.post('/', (req,res)=>{ try{ res.status(201).json(addCategoria(req.body)) }catch(e){ res.status(400).json({error:e.message}) } })
export default router
