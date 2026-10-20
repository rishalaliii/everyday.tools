import test from 'node:test';
import assert from 'node:assert/strict';
import { OPS, convert, toTemp } from '../assets/js/calc.js';
const v = (r, i = 0) => r[i][1];
test('percent', () => {
  assert.equal(v(OPS.percent({ mode: 'of', a: '15', b: '200' })), '30');
  assert.equal(v(OPS.percent({ mode: 'is', a: '50', b: '200' })), '25%');
  assert.equal(v(OPS.percent({ mode: 'chg', a: '100', b: '150' })), '50%');
  assert.throws(() => OPS.percent({ mode: 'is', a: '1', b: '0' }));
});
test('discount', () => {
  const r = OPS.discount({ price: '1000', disc: '20', tax: '10' });
  assert.equal(v(r, 0), '200'); assert.equal(v(r, 1), '800'); assert.equal(v(r, 3), '880');
  assert.throws(() => OPS.discount({ price: '1', disc: '101', tax: '' }));
});
test('age & date difference', () => {
  const r = OPS.age({ dob: '2000-02-29', asof: '2024-03-01' });
  assert.equal(v(r, 0), '24 years, 0 months, 1 day');
  assert.equal(v(OPS.age({ dob: '1990-05-10', asof: '2020-05-10' }), 4), 'Today!');
  assert.throws(() => OPS.age({ dob: '2030-01-01', asof: '2020-01-01' }));
  const d = OPS.datediff({ d1: '2024-01-31', d2: '2024-03-01' });
  assert.equal(v(d, 1), '30'); assert.equal(v(d, 0), '0 years, 1 month, 1 day');
  assert.equal(v(OPS.datediff({ d1: '2024-03-01', d2: '2024-01-31' }), 1), '30');
  assert.throws(() => OPS.datediff({ d1: '2023-02-30', d2: '2024-01-01' }));
});
test('gst', () => {
  const a = OPS.gst({ mode: 'add', amount: '1000', rate: '18' });
  assert.equal(v(a, 1), '180'); assert.equal(v(a, 3), '1,180');
  const b = OPS.gst({ mode: 'remove', amount: '1180', rate: '18' });
  assert.equal(v(b, 0), '1,000'); assert.equal(v(b, 1), '180');
});
test('bmi', () => {
  assert.equal(v(OPS.bmi({ unit: 'metric', height: '170', weight: '65' })), '22.5');
  assert.equal(v(OPS.bmi({ unit: 'metric', height: '170', weight: '65' }), 1), 'Normal range');
  assert.equal(v(OPS.bmi({ unit: 'imperial', height: '66.9291', weight: '143.3' })), '22.5');
  assert.throws(() => OPS.bmi({ unit: 'metric', height: '0', weight: '65' }));
});
test('emi', () => {
  const r = OPS.emi({ principal: '500000', rate: '9', tenure: '5', tunit: 'years' });
  assert.equal(v(r, 0), '10,379.18');
  assert.equal(v(r, 2), '622,750.66');
  assert.equal(v(OPS.emi({ principal: '1200', rate: '0', tenure: '12', tunit: 'months' })), '100');
  assert.throws(() => OPS.emi({ principal: '0', rate: '5', tenure: '1', tunit: 'years' }));
});
test('converters', () => {
  assert.ok(Math.abs(convert('length', 1, 'km', 'mi') - 0.621371) < 1e-5);
  assert.ok(Math.abs(convert('length', 12, 'in', 'ft') - 1) < 1e-12);
  assert.ok(Math.abs(convert('weight', 1, 'kg', 'lb') - 2.204623) < 1e-5);
  assert.equal(toTemp(100, 'C', 'F'), 212); assert.equal(toTemp(32, 'F', 'C'), 0);
  assert.ok(Math.abs(toTemp(0, 'C', 'K') - 273.15) < 1e-9);
  assert.equal(convert('data', 1, 'GB', 'MB'), 1024); assert.equal(convert('data', 1, 'GB', 'MB', 1000), 1000);
  assert.equal(convert('data', 1, 'B', 'bit'), 8);
  assert.throws(() => OPS.temperature({ value: '-300', from: 'C', to: 'F' }));
  assert.equal(v(OPS.length({ value: '1', from: 'km', to: 'm' })), '1,000 m');
});
