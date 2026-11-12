import assert from 'node:assert/strict';
import {test} from 'node:test';
import {displayEffortTarget} from '../../src/effortTarget.js';
import {createSession} from '../../src/data.js';
import {makeDb} from '../fixtures.js';

test('legacy numeric effort targets convert to ascending RPE without changing unrelated text',()=>{
 const examples=[
  ['0 RIR','RPE 10'],
  ['1–2 RIR','RPE 8–9'],
  ['RIR 2 to 3','RPE 7–8'],
  ['1.5 reps in reserve','RPE 8.5'],
  ['Top RPE 8; backoffs 2-3 RIR','Top RPE 8; backoffs RPE 7–8'],
  ['RPE 6.5–8; technique work','RPE 6.5–8; technique work'],
  ['12 RIR; -2 RIR','12 RIR; -2 RIR'],
  ['', ''],
 ];
 for(const [stored,expected] of examples){
  assert.equal(displayEffortTarget(stored),expected);
  assert.equal(displayEffortTarget(expected),expected);
 }
});

test('prefix RIR converts whole targets before sentence punctuation',()=>{
 assert.equal(displayEffortTarget('Top set RIR 1. Backoffs RIR 1–2.'),'Top set RPE 9. Backoffs RPE 8–9.');
 assert.equal(displayEffortTarget('Backoffs RIR 1.5.'),'Backoffs RPE 8.5.');
 assert.equal(displayEffortTarget('RIR 1.5kg'),'RIR 1.5kg');
});

test('new workouts use RPE even when started from an older template',()=>{
 const db=makeDb();
 db.templates['Push A'][0][3]='Top RPE 8; backoffs 2 RIR';
 const session=createSession('Push A','2026-10-30',db.templates);
 assert.equal(session.exercises[0].target,'Top RPE 8; backoffs RPE 8');
 assert.equal(session.exercises[0].sets[0].rpe,'');
 assert.equal(db.templates['Push A'][0][3],'Top RPE 8; backoffs 2 RIR');
});
