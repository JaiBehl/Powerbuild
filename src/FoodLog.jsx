import React,{useState} from 'react';
import {Plus,Pencil,Save,Trash2,X} from 'lucide-react';

const MEALS=['Breakfast','Lunch','Dinner','Snacks','Other'];
const emptyFood=(meal='Breakfast')=>({name:'',meal,calories:'',protein:'',carbs:'',fat:''});
const asNumber=(value)=>Math.max(0,Number(value)||0);
const sumFoods=(items)=>items.reduce((totals,item)=>({
  calories:totals.calories+asNumber(item.calories),
  protein:totals.protein+asNumber(item.protein),
  carbs:totals.carbs+asNumber(item.carbs),
  fat:totals.fat+asNumber(item.fat),
}),{calories:0,protein:0,carbs:0,fat:0});
const format=(value)=>Number(value).toLocaleString('en-US',{maximumFractionDigits:1});
const normalizeMeal=(meal)=>MEALS.includes(meal)?meal:'Other';

function makeFood(input,originalId){
  const name=String(input.name||'').trim();
  if(!name)throw Error('Enter a food or meal name.');
  const nutrientKeys=['calories','protein','carbs','fat'];
  for(const key of nutrientKeys){
    const raw=String(input[key]??'').trim();
    if(raw!==''&&(!Number.isFinite(Number(raw))||Number(raw)<0)){
      throw Error('Food calories and macros must be nonnegative numbers.');
    }
  }
  const protein=asNumber(input.protein);
  const carbs=asNumber(input.carbs);
  const fat=asNumber(input.fat);
  const enteredCalories=String(input.calories??'').trim();
  const calories=enteredCalories!==''?asNumber(input.calories):Math.round(protein*4+carbs*4+fat*9);
  if(calories===0&&protein===0&&carbs===0&&fat===0){
    throw Error('Enter calories or macronutrients for this food.');
  }
  return {
    id:originalId??(globalThis.crypto?.randomUUID?.()||'food-'+Date.now()+'-'+Math.random().toString(36).slice(2)),
    name,meal:normalizeMeal(input.meal),
    calories,protein,carbs,fat,
  };
}

export default function FoodLog({date,setDate,items=[],updateDayRecord,entry,setEntry,target,macros}){
  const [error,setError]=useState('');
  const [editingId,setEditingId]=useState(null);
  const [editDraft,setEditDraft]=useState(emptyFood());
  const logged=Array.isArray(items)?items:[];
  const totals=sumFoods(logged);
  const remaining=target-totals.calories;
  const macroRows=[
    ['Protein',totals.protein,macros.protein],
    ['Carbs',totals.carbs,macros.carbs],
    ['Fat',totals.fat,macros.fat],
  ];

  const addFood=()=>{
    try{
      const food=makeFood(entry);
      updateDayRecord(day=>({...day,items:[...day.items,food]}));
      setEntry(emptyFood(normalizeMeal(entry.meal)));
      setError('');
    }catch(e){setError(e.message);}
  };

  const removeFood=(id)=>{
    updateDayRecord(day=>({...day,items:day.items.filter(item=>item.id!==id)}));
    if(editingId===id)setEditingId(null);
    setError('');
  };

  const editFood=(food)=>{
    setEditingId(food.id);
    setEditDraft({
      name:String(food.name||'Food entry'),
      meal:normalizeMeal(food.meal),
      calories:food.calories??'',protein:food.protein??'',carbs:food.carbs??'',fat:food.fat??'',
    });
    setError('');
  };
  const saveFood=()=>{
    try{
      const food=makeFood(editDraft,editingId);
      updateDayRecord(day=>({...day,items:day.items.map(item=>item.id===editingId?food:item)}));
      setEditingId(null);
      setError('');
    }catch(e){setError(e.message);}
  };

  return <section className="panel food-log-panel">
    <div className="between">
      <div><h2>Food &amp; meal log</h2><p className="muted">Log each food or meal separately. Every entry immediately updates today's calorie and macro totals.</p></div>
      <input aria-label="Food log date" type="date" value={date} onChange={e=>{setDate(e.target.value);setEditingId(null);setError('');}}/>
    </div>

    <div className="summary food-summary">
      <div className="metric"><small>CALORIES EATEN</small><strong>{format(totals.calories)} <span>kcal</span></strong><small>of {format(target)} kcal goal</small></div>
      <div className="metric"><small>CALORIES {remaining>=0?'REMAINING':'OVER GOAL'}</small><strong>{format(Math.abs(remaining))} <span>kcal</span></strong></div>
      {macroRows.map(([name,eaten,goal])=><div className="metric" key={name}>
        <small>{name.toUpperCase()} EATEN</small><strong>{format(eaten)} <span>g</span></strong><small>of {format(goal)} g goal · {format(goal-eaten)} g remaining</small>
      </div>)}
    </div>

    <div className="food-add-box">
      <h3>Add a food or meal</h3>
      <div className="formgrid food-entry-fields">
        <label className="food-entry-name">Food / meal name<input type="text" placeholder="e.g., Chicken and rice" value={entry.name||''} onChange={e=>setEntry(prev=>({...prev,name:e.target.value}))}/></label>
        <label>Meal<select value={normalizeMeal(entry.meal||'Breakfast')} onChange={e=>setEntry(prev=>({...prev,meal:e.target.value}))}>{MEALS.map(meal=><option key={meal}>{meal}</option>)}</select></label>
        {[['calories','Calories (kcal)'],['protein','Protein (g)'],['carbs','Carbs (g)'],['fat','Fat (g)']].map(([key,label])=><label key={key}>{label}<input type="number" min="0" step="0.1" placeholder={key==='calories'?'Auto from macros if blank':'0'} value={entry[key]??''} onChange={e=>setEntry(prev=>({...prev,[key]:e.target.value}))}/></label>)}
      </div>
      <p className="muted food-hint">Enter the calories and macros from the food label. If calories are blank, the app estimates them from protein (4 kcal/g), carbs (4 kcal/g), and fat (9 kcal/g).</p>
      <button className="primary" onClick={addFood}><Plus size={16}/> Add food to daily totals</button>
      {error&&<p className="error" role="alert">{error}</p>}
    </div>

    <div className="food-history">
      <div className="between"><h3>Today's entries</h3><span className="muted">{logged.length} {logged.length===1?'entry':'entries'}</span></div>
      {logged.length===0?<p className="empty">No meals logged for this date yet.</p>:MEALS.map(meal=>{
        const foods=logged.filter(item=>normalizeMeal(item.meal)===meal);
        if(!foods.length)return null;
        const groupTotal=sumFoods(foods);
        return <div className="food-meal-group" key={meal}>
          <div className="food-meal-heading"><b>{meal}</b><span>{format(groupTotal.calories)} kcal</span></div>
          {foods.map(food=><div className="food-item" key={food.id}>
            {editingId===food.id?<div className="food-edit-box">
              <div className="formgrid food-entry-fields">
                <label className="food-entry-name">Name<input value={editDraft.name} onChange={e=>setEditDraft(p=>({...p,name:e.target.value}))}/></label>
                <label>Meal<select value={editDraft.meal} onChange={e=>setEditDraft(p=>({...p,meal:e.target.value}))}>{MEALS.map(option=><option key={option}>{option}</option>)}</select></label>
                {[['calories','Calories'],['protein','Protein'],['carbs','Carbs'],['fat','Fat']].map(([key,label])=><label key={key}>{label}<input type="number" min="0" step="0.1" value={editDraft[key]} onChange={e=>setEditDraft(p=>({...p,[key]:e.target.value}))}/></label>)}
              </div>
              <div className="actions"><button className="primary" onClick={saveFood}><Save size={15}/> Save changes</button><button className="secondary" onClick={()=>{setEditingId(null);setError('')}}><X size={15}/> Cancel</button></div>
            </div>:<>
              <div className="food-item-copy"><strong>{food.name||'Food entry'}</strong><small>{format(asNumber(food.calories))} kcal · P {format(asNumber(food.protein))} g · C {format(asNumber(food.carbs))} g · F {format(asNumber(food.fat))} g</small></div>
              <div className="food-item-actions">
                <button className="iconbtn subtle" aria-label={'Edit '+(food.name||'food entry')} title="Edit food" onClick={()=>editFood(food)}><Pencil size={15}/></button>
                <button className="iconbtn subtle" aria-label={'Remove '+(food.name||'food entry')} title="Remove food" onClick={()=>removeFood(food.id)}><Trash2 size={15}/></button>
              </div>
            </>}
          </div>)}
        </div>;
      })}
    </div>
  </section>;
}
