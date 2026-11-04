import {test,expect} from '@playwright/test';
import {seed,makeDb,makeSession,readDb,openTab,card} from '../fixtures.js';

test('Workout editor searches saved exercises before opening the native dropdown',async({page})=>{
  await seed(page);
  await openTab(page,'Library');
  const editor=card(page,'Workout editor');
  const search=editor.getByRole('searchbox',{name:'Search exercise options'});
  const picker=editor.getByLabel('Saved exercise to add',{exact:true});
  await expect(search).toBeVisible();
  const before=(await picker.locator('option').allTextContents()).length;
  expect(before).toBeGreaterThan(15);

  await search.fill('calf');
  const results=await picker.locator('option').allTextContents();
  expect(results).toContain('Standing calf raise');
  expect(results).toContain('Seated calf raise');
  expect(results).not.toContain('Barbell bench press');
  await expect(editor.getByText('2 matching exercises')).toBeVisible();

  await picker.selectOption({label:'Standing calf raise'});
  const selectedId=await picker.inputValue();
  await search.fill('bench');
  await expect(picker).toHaveValue(selectedId); // search never silently changes the selected exercise
  await expect(picker.locator('option',{hasText:'Standing calf raise'})).toHaveCount(1);
  await search.fill('nothing-matches-any-exercise');
  await expect(editor.getByText('No matching exercises')).toBeVisible();
  await expect(picker).toHaveValue(selectedId);
  await search.fill('');
  await editor.getByRole('button',{name:'Add saved exercise',exact:true}).click();
  await expect(editor.locator('.template-exercise')).toHaveCount(1);
  await expect(editor.locator('.template-exercise').first()).toContainText('Standing calf raise');

  const db=await readDb(page);
  expect(db.sessions).toEqual([]); // choosing/searching doesn't write a workout log
});

test('chart and both strength record selectors share searchable filtering and selected lift',async({page})=>{
  const session=makeSession('Push A','2026-10-29');
  session.exercises[0].sets[0]={weight:185,reps:5,rpe:8,done:true};
  await seed(page,makeDb({sessions:[session]}));
  await openTab(page,'Progress');

  const chart=card(page,'Estimated 1RM trend');
  const chartSearch=chart.getByRole('searchbox',{name:'Search exercise options'});
  const chartSelect=chart.getByLabel('Select exercise to chart');
  await chartSearch.fill('bench');
  await expect(chartSelect.locator('option',{hasText:'Barbell back squat'})).toHaveCount(0);
  await chartSelect.selectOption('Touch-and-go bench press');
  await expect(chartSelect).toHaveValue('Touch-and-go bench press');

  const absolute=card(page,'Absolute strength records');
  const relative=card(page,'Relative strength records');
  const absSearch=absolute.getByRole('searchbox',{name:'Search exercise options'});
  const relSearch=relative.getByRole('searchbox',{name:'Search exercise options'});
  await absSearch.fill('squat');
  const absSelect=absolute.getByLabel('Exercise for records',{exact:true});
  await expect(absSelect.locator('option',{hasText:'Barbell back squat'})).toHaveCount(1);
  await absSelect.selectOption('Barbell back squat');
  await expect(chartSelect).toHaveValue('Barbell back squat');
  await expect(relative.getByLabel('Exercise for relative records')).toHaveValue('Barbell back squat');

  await relSearch.fill('OHP');
  await expect(relative.getByLabel('Exercise for relative records').locator('option',{hasText:'Supported seated barbell OHP'})).toHaveCount(1);
  await expect(relative.getByLabel('Exercise for relative records')).toHaveValue('Barbell back squat');
});

test('exercise search menus fit mobile widths and remain keyboard selectable',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await seed(page);
  await openTab(page,'Library');
  const editor=card(page,'Workout editor');
  const search=editor.getByRole('searchbox',{name:'Search exercise options'});
  await search.fill('lateral');
  await expect(editor.getByLabel('Saved exercise to add').locator('option',{hasText:'Cable lateral raise'})).toHaveCount(1);
  await editor.getByLabel('Saved exercise to add').focus();
  await editor.getByLabel('Saved exercise to add').selectOption({label:'Cable lateral raise'});
  await expect(editor.getByLabel('Saved exercise to add')).not.toHaveValue('');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
