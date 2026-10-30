import React,{useState} from 'react';
import {Plus,Pencil,Save,Trash2,X,BookmarkPlus} from 'lucide-react';
import ServingPicker from './ServingPicker';
import {MEALS,NUTRIENTS,emptyFood,asNumber,sumFoods,formatAmount,normalizeMeal,makeLoggedFood,savedFoodFrom,portionOfLoggedFood} from './foodLibrary';

export default function FoodLog({date,setDate,items=[],updateDayRecord,entry,setEntry,target,macros,onSaveToLibrary}){
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
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
      const food=makeLoggedFood(entry,entry.servings??'1');
      updateDayRecord(day=>({...day,items:[...day.items,food]}));
      setEntry(emptyFood(normalizeMeal(entry.meal)));
      setMessage('Added '+food.name+' ('+formatAmount(food.servings)+' serving(s)) to the daily log.');
      setError('');
    }catch(e){setMessage('');setError(e.message);}
  };

  const saveFoodToLibrary=(raw)=>{
    try{
      const saved=savedFoodFrom(raw);
      onSaveToLibrary(saved);
      setMessage('Saved "'+saved.name+'" to Saved Foods. You can reuse it from the library below.');
      setError('');
    }catch(e){setMessage('');setError(e.message);}
  };

  const removeFood=(id)=>{
    updateDayRecord(day=>({...day,items:day.items.filter(item=>item.id!==id)}));
    if(editingId===id)setEditingId(null);
    setMessage('');
    setError('');
  };

  const editFood=(food)=>{
    setEditingId(food.id);
    try{
      const portion=portionOfLoggedFood(food);
      setEditDraft({...portion,servings:String(food.servings??'1')});
      setError('');
      setMessage('');
    }catch(e){setError(e.message);}
  };
  const saveFood=()=>{
    try{
      const existing=logged.find(item=>item.id===editingId);
      const food=makeLoggedFood(editDraft,editDraft.servings,editingId,existing?.sourceSavedFoodId);
      updateDayRecord(day=>({...day,items:day.items.map(item=>item.id===editingId?food:item)}));
      setEditingId(null);
      setMessage('');
      setError('');
    }catch(e){setError(e.message);}
  };

  return <section className="panel food-log-panel">
    <div className="between">
      <div><h2>Food &amp; meal log</h2><p className="muted">Log foods individually. Enter nutrition for one serving and choose how many servings you ate; daily totals update automatically.</p></div>
      <input aria-label="Food log date" type="date" value={date} onChange={e=>{setDate(e.target.value);setEditingId(null);setError('');setMessage('');}}/>
    </div>

    <div className="summary food-summary">
      <div className="metric"><small>CALORIES EATEN</small><strong>{formatAmount(totals.calories)} <span>kcal</span></strong><small>of {formatAmount(target)} kcal goal</small></div>
      <div className="metric"><small>CALORIES {remaining>=0?'REMAINING':'OVER GOAL'}</small><strong>{formatAmount(Math.abs(remaining))} <span>kcal</span></strong></div>
      {macroRows.map(([name,eaten,goal])=><div className="metric" key={name}>
        <small>{name.toUpperCase()} EATEN</small><strong>{formatAmount(eaten)} <span>g</span></strong><small>of {formatAmount(goal)} g goal · {formatAmount(goal-eaten)} g remaining</small>
      </div>)}
    </div>

    <div className="food-add-box">
      <h3>Add a food or meal</h3>
      <div className="formgrid food-entry-fields">
        <label className="food-entry-name">Food / meal name<input type="text" placeholder="e.g., Chicken and rice" value={entry.name||''} onChange={e=>setEntry(prev=>({...prev,name:e.target.value}))}/></label>
        <label>Meal<select value={normalizeMeal(entry.meal||'Breakfast')} onChange={e=>setEntry(prev=>({...prev,meal:e.target.value}))}>{MEALS.map(meal=><option key={meal}>{meal}</option>)}</select></label>
        {NUTRIENTS.map(key=><label key={key}>{key[0].toUpperCase()+key.slice(1)} ({key==='calories'?'kcal':'g'}) per serving<input type="number" min="0" step="0.01" placeholder={key==='calories'?'Auto from macros if blank':'0'} value={entry[key]??''} onChange={e=>setEntry(prev=>({...prev,[key]:e.target.value}))}/></label>)}
      </div>
      <ServingPicker value={entry.servings??'1'} onChange={value=>setEntry(prev=>({...prev,servings:value}))}/>
      <p className="muted food-hint">Nutrition fields are for <b>one serving</b>. Use ¼, ½, 1, 2, or any custom serving amount. If calories are blank, they're estimated from protein (4 kcal/g), carbs (4 kcal/g), and fat (9 kcal/g).</p>
      <div className="actions">
        <button className="primary" onClick={addFood}><Plus size={16}/> Add food to daily totals</button>
        <button className="secondary" onClick={()=>saveFoodToLibrary(entry)}><BookmarkPlus size={16}/> Save to Saved Foods</button>
      </div>
      {message&&<p className="food-success" role="status">{message}</p>}
      {error&&<p className="error" role="alert">{error}</p>}
    </div>

    <div className="food-history">
      <div className="between"><h3>Today's entries</h3><span className="muted">{logged.length} {logged.length===1?'entry':'entries'}</span></div>
      {logged.length===0?<p className="empty">No meals logged for this date yet.</p>:MEALS.map(meal=>{
        const foods=logged.filter(item=>normalizeMeal(item.meal)===meal);
        if(!foods.length)return null;
        const groupTotal=sumFoods(foods);
        return <div className="food-meal-group" key={meal}>
          <div className="food-meal-heading"><b>{meal}</b><span>{formatAmount(groupTotal.calories)} kcal</span></div>
          {foods.map(food=><div className="food-item" key={food.id}>
            {editingId===food.id?<div className="food-edit-box">
              <div className="formgrid food-entry-fields">
                <label className="food-entry-name">Name<input value={editDraft.name} onChange={e=>setEditDraft(p=>({...p,name:e.target.value}))}/></label>
                <label>Meal<select value={editDraft.meal} onChange={e=>setEditDraft(p=>({...p,meal:e.target.value}))}>{MEALS.map(option=><option key={option}>{option}</option>)}</select></label>
                {NUTRIENTS.map(key=><label key={key}>{key[0].toUpperCase()+key.slice(1)} ({key==='calories'?'kcal':'g'}) per serving<input type="number" min="0" step="0.01" value={editDraft[key]??''} onChange={e=>setEditDraft(p=>({...p,[key]:e.target.value}))}/></label>)}
              </div>
              <ServingPicker value={editDraft.servings??'1'} onChange={value=>setEditDraft(p=>({...p,servings:value}))}/>
              <div className="actions"><button className="primary" onClick={saveFood}><Save size={15}/> Save changes</button><button className="secondary" onClick={()=>{setEditingId(null);setError('');}}><X size={15}/> Cancel</button></div>
            </div>:<>
              <div className="food-item-copy"><strong>{food.name||'Food entry'}{Number(food.servings)>0&&Number(food.servings)!==1?' · '+formatAmount(food.servings)+' servings':''}</strong><small>{formatAmount(asNumber(food.calories))} kcal · P {formatAmount(asNumber(food.protein))} g · C {formatAmount(asNumber(food.carbs))} g · F {formatAmount(asNumber(food.fat))} g</small></div>
              <div className="food-item-actions">
                <button className="iconbtn subtle" aria-label={'Save '+(food.name||'food entry')+' to Saved Foods'} title="Save to Saved Foods" onClick={()=>{
                  try{saveFoodToLibrary(portionOfLoggedFood(food));}catch(e){setError(e.message);}
                }}><BookmarkPlus size={15}/></button>
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
