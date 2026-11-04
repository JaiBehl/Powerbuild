import React,{useId,useState} from 'react';

/**
 * Keep native <select> keyboard, screen-reader and mobile behavior, while
 * adding an explicit text filter to large exercise menus.
 *
 * The currently selected option remains available even if it doesn't match
 * a new search. Filtering must never silently rewrite a saved selection.
 */
export default function SearchableExerciseSelect({
  label='Exercise',
  ariaLabel,
  options=[],
  value='',
  onChange,
  emptyLabel,
  emptyValue='',
  placeholder='Search exercises…',
  className='',
}){
  const id=useId();
  const [query,setQuery]=useState('');
  const normalized=options.map(item=>typeof item==='string'
    ?{value:item,label:item}
    :{value:String(item.value),label:String(item.label)});
  const term=query.trim().toLocaleLowerCase();
  const matches=term
    ?normalized.filter(item=>item.label.toLocaleLowerCase().includes(term))
    :normalized;
  const selected=normalized.find(item=>item.value===String(value));
  const visible=selected&&!matches.some(item=>item.value===selected.value)
    ?[selected,...matches]
    :matches;

  return <div className={'searchable-exercise-select '+className}>
    <label htmlFor={id}>{label}</label>
    <input
      type="search"
      autoComplete="off"
      aria-label={'Search '+label.toLowerCase()}
      placeholder={placeholder}
      value={query}
      onChange={event=>setQuery(event.target.value)}
    />
    <select id={id} aria-label={ariaLabel||label} value={value??''}
      onChange={event=>onChange(event.target.value)}>
      {emptyLabel!=null&&<option value={emptyValue}>{emptyLabel}</option>}
      {visible.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
    {term&&<small className="exercise-search-count" role="status">
      {matches.length?matches.length+' matching '+(matches.length===1?'exercise':'exercises'):'No matching exercises'}
    </small>}
  </div>;
}
