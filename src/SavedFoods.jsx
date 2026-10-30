import React,{useState} from 'react';
import {Plus,Pencil,Save,Trash2,X} from 'lucide-react';
import CalorieSection from './CalorieSection';
import ServingPicker from './ServingPicker';
import {MEALS,NUTRIENTS,formatAmount,makeLoggedFood,normalizeMeal,savedFoodFrom} from './foodLibrary';

export default function SavedFoods({foods=[],date,onAddToLog,onEditFood,onDeleteFood}){
  const [search,setSearch]=useState('');
  const [servingAmounts,setServingAmounts]=useState({});
  const [mealChoices,setMealChoices]=useState({});
  const [editingId,setEditingId]=useState(null);
  const [draft,setDraft]=useState({});
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const library=Array.isArray(foods)?foods:[];
  const visible=library.filter(f=>String(f.name||'').toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a,b)=>String(a.name).localeCompare(String(b.name)));

  const addToLog=(food)=>{
    try{
      const servings=servingAmounts[food.id]??'1';
      const meal=mealChoices[food.id]||normalizeMeal(food.meal);
      const logged=makeLoggedFood({...food,meal},servings,undefined,food.id);
      onAddToLog(logged);
      setMessage('Added '+formatAmount(logged.servings)+' serving(s) of '+logged.name+' to '+meal+' on '+date+'.');
      setError('');
    }catch(e){setMessage('');setError(e.message);}
  };

  const edit=(food)=>{
    setEditingId(food.id);
    setDraft({name:food.name,meal:normalizeMeal(food.meal),...Object.fromEntries(NUTRIENTS.map(key=>[key,food[key]??'']))});
    setError('');
    setMessage('');
  };
  const saveEdit=()=>{
    try{
      const next=savedFoodFrom(draft,editingId);
      onEditFood(next);
      setEditingId(null);
      setError('');
      setMessage('Saved '+next.name+' to your library. Existing daily logs were not changed.');
    }catch(e){setError(e.message);}
  };
  const remove=(food)=>{
    if(!window.confirm('Remove '+food.name+' from Saved Foods? Previously logged meals will stay in your food history.'))return;
    onDeleteFood(food.id);
    if(editingId===food.id)setEditingId(null);
    setMessage('Removed '+food.name+' from Saved Foods.');
    setError('');
  };

  return <CalorieSection
    title="Saved Foods"
    description="Your personal food library. Choose a serving amount and add a saved food to the selected day's log."
    summary={library.length+' saved'}
    className="saved-foods-panel"
  >
      {library.length===0?<p className="empty">No saved foods yet. Use "Save to Saved Foods" when adding a food or the bookmark beside any previously logged meal.</p>:<>
        <label className="saved-foods-search">Find saved food
          <input type="search" value={search} placeholder="Search your food library" onChange={e=>setSearch(e.target.value)}/>
        </label>
        {visible.length===0?<p className="empty">No saved foods match that search.</p>:<div className="saved-foods-list">
          {visible.map(food=><div className="saved-food-item" key={food.id}>
            {editingId===food.id?<div className="saved-food-edit">
              <div className="formgrid food-entry-fields">
                <label className="food-entry-name">Name<input value={draft.name||''} onChange={e=>setDraft(p=>({...p,name:e.target.value}))}/></label>
                <label>Default meal<select value={draft.meal||'Other'} onChange={e=>setDraft(p=>({...p,meal:e.target.value}))}>{MEALS.map(meal=><option key={meal}>{meal}</option>)}</select></label>
                {NUTRIENTS.map(key=><label key={key}>{key[0].toUpperCase()+key.slice(1)} ({key==='calories'?'kcal':'g'})<input type="number" min="0" step="0.01" value={draft[key]??''} onChange={e=>setDraft(p=>({...p,[key]:e.target.value}))}/></label>)}
              </div>
              <div className="actions"><button className="primary" onClick={saveEdit}><Save size={15}/> Save food</button><button className="secondary" onClick={()=>setEditingId(null)}><X size={15}/> Cancel</button></div>
            </div>:<>
              <div className="saved-food-description">
                <div className="between">
                  <strong>{food.name}</strong>
                  <div className="food-item-actions">
                    <button className="iconbtn subtle" aria-label={'Edit saved '+food.name} title="Edit saved food" onClick={()=>edit(food)}><Pencil size={15}/></button>
                    <button className="iconbtn subtle" aria-label={'Delete saved '+food.name} title="Delete saved food" onClick={()=>remove(food)}><Trash2 size={15}/></button>
                  </div>
                </div>
                <small>Per serving: {formatAmount(food.calories)} kcal · P {formatAmount(food.protein)} g · C {formatAmount(food.carbs)} g · F {formatAmount(food.fat)} g</small>
              </div>
              <div className="saved-food-add-row">
                <ServingPicker value={servingAmounts[food.id]??'1'} label="Servings" onChange={value=>setServingAmounts(p=>({...p,[food.id]:value}))}/>
                <label>Meal<select aria-label={'Meal for '+food.name} value={mealChoices[food.id]||normalizeMeal(food.meal)} onChange={e=>setMealChoices(p=>({...p,[food.id]:e.target.value}))}>{MEALS.map(meal=><option key={meal}>{meal}</option>)}</select></label>
                <button className="primary saved-food-add-button" onClick={()=>addToLog(food)}><Plus size={16}/> Add to log</button>
              </div>
            </>}
          </div>)}
        </div>}
      </>}
      {message&&<p className="food-success" role="status">{message}</p>}
      {error&&<p className="error" role="alert">{error}</p>}
  </CalorieSection>;
}
