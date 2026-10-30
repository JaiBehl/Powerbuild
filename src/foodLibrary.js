// Saved foods store nutrition PER ONE serving. Logged foods store totals
// for the number of servings eaten so previous entries never change when
// a saved food is edited later.
export const MEALS=['Breakfast','Lunch','Dinner','Snacks','Other'];
export const NUTRIENTS=['calories','protein','carbs','fat'];
export const emptyFood=(meal='Breakfast')=>({name:'',meal,servings:'1',calories:'',protein:'',carbs:'',fat:''});
export const asNumber=(value)=>Math.max(0,Number(value)||0);
export const formatAmount=(value)=>Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});
export const normalizeMeal=(meal)=>MEALS.includes(meal)?meal:'Other';

const round=(n)=>Math.round((n+Number.EPSILON)*100)/100;
const makeId=()=>globalThis.crypto?.randomUUID?.()||'food-'+Date.now()+'-'+Math.random().toString(36).slice(2);

export function parseServings(value){
  const raw=String(value??'').trim();
  const n=Number(raw);
  if(!raw||!Number.isFinite(n)||n<=0||n>100)throw Error('Servings must be greater than 0 and at most 100.');
  return n;
}

export function foodPortion(input){
  const name=String(input?.name||'').trim();
  if(!name)throw Error('Enter a food or meal name.');
  for(const key of NUTRIENTS){
    const raw=String(input?.[key]??'').trim();
    if(raw!==''&&(!Number.isFinite(Number(raw))||Number(raw)<0)){
      throw Error('Food calories and macros must be nonnegative numbers.');
    }
  }
  const protein=asNumber(input.protein);
  const carbs=asNumber(input.carbs);
  const fat=asNumber(input.fat);
  const enteredCalories=String(input.calories??'').trim();
  const calories=enteredCalories!==''?asNumber(input.calories):round(protein*4+carbs*4+fat*9);
  if(calories===0&&protein===0&&carbs===0&&fat===0){
    throw Error('Enter calories or macronutrients for this food.');
  }
  return {name,meal:normalizeMeal(input.meal),calories,protein,carbs,fat};
}

export function savedFoodFrom(input,id){
  return {...foodPortion(input),id:id??makeId()};
}

export function portionOfLoggedFood(food){
  if(food?.perServing&&typeof food.perServing==='object'){
    return foodPortion({
      name:food.name||'Food entry',meal:food.meal,...food.perServing,
    });
  }
  // Older entries have only total nutrition. Treat these as one serving.
  const servings=(Number(food?.servings)>0&&Number.isFinite(Number(food.servings)))?Number(food.servings):1;
  return foodPortion({
    name:food?.name||'Food entry',meal:food?.meal,
    ...Object.fromEntries(NUTRIENTS.map(key=>[key,round(asNumber(food?.[key])/servings)])),
  });
}

export function makeLoggedFood(input,servings=1,originalId,sourceSavedFoodId){
  const portion=foodPortion(input);
  const count=parseServings(servings);
  return {
    id:originalId??makeId(),
    name:portion.name,
    meal:portion.meal,
    servings:count,
    perServing:Object.fromEntries(NUTRIENTS.map(key=>[key,portion[key]])),
    ...Object.fromEntries(NUTRIENTS.map(key=>[key,round(portion[key]*count)])),
    ...(sourceSavedFoodId?{sourceSavedFoodId}:{}),
  };
}

export function sumFoods(items){
  return items.reduce((totals,item)=>({
    calories:totals.calories+asNumber(item.calories),
    protein:totals.protein+asNumber(item.protein),
    carbs:totals.carbs+asNumber(item.carbs),
    fat:totals.fat+asNumber(item.fat),
  }),{calories:0,protein:0,carbs:0,fat:0});
}
