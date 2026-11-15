// node --import ./.tools/register.mjs .tools/topic-analytics-regression.mjs
import assert from 'node:assert/strict'
import { topicAccuracy } from '@/lib/topic-analytics'

const topics = [
  { id:'math-geo', subject_id:'math', name:'Geometry', slug:'geometry' },
  { id:'inf-geo', subject_id:'inf', name:'Geometry', slug:'informatics-geometry' },
  { id:'math-algebra', subject_id:'math', name:'Algebra', slug:'algebra' },
]
const tasks = [
  {id:'m1',topic_id:'math-geo',subject_id:'math'},
  {id:'i1',topic_id:'inf-geo',subject_id:'inf'},
  {id:'a1',topic_id:'math-algebra',subject_id:'math'},
  {id:'invalid',topic_id:'math-geo',subject_id:'inf'},
]
const attempts = [
  {task_id:'m1',is_correct:true}, {task_id:'i1',is_correct:false},
  {task_id:'a1',is_correct:true}, {task_id:'i1',is_correct:false},
]
const subjects = {math:'Mathematics',inf:'Informatics'}
const translate = (text) => ({Geometry:'Геометрия',Mathematics:'Математика',Informatics:'Информатика'}[text] ?? text)
const result = topicAccuracy(attempts,tasks,topics,subjects,translate)
assert.deepEqual(result.find((topic) => topic.slug === 'geometry'), {
  topic:'Геометрия · Математика',slug:'geometry',attempts:1,correct:1,mastery:100,
})
assert.deepEqual(result.find((topic) => topic.slug === 'informatics-geometry'), {
  topic:'Геометрия · Информатика',slug:'informatics-geometry',attempts:2,correct:0,mastery:0,
})
assert.equal(result.find((topic) => topic.slug === 'algebra').topic,'Algebra', 'Existing unambiguous labels keep their API shape')
assert.deepEqual(topicAccuracy(attempts.filter((a)=>a.task_id!=='m1'),tasks,topics,subjects).filter((topic)=>topic.slug==='geometry'),[], 'Another subject cannot create Mathematics evidence')
const invalid = topicAccuracy([{task_id:'invalid',is_correct:true},{task_id:'deleted-task',is_correct:false}],tasks,topics,subjects)
assert.deepEqual(invalid,[{topic:'General practice',slug:undefined,attempts:2,correct:1,mastery:50}], 'Missing or cross-subject references cannot count toward a known topic')
console.log('PASS: subject-scoped topic accuracy, independent evidence, correct route links and localized collision labels.')
