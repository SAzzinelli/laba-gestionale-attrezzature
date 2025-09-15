import { configureStore, createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name:'ui',
  initialState:{ calendarView:'month' },
  reducers:{
    setCalendarView:(s,a)=>{ s.calendarView=a.payload },
  }
})
export const { setCalendarView } = uiSlice.actions
export default configureStore({ reducer: { ui: uiSlice.reducer } })
