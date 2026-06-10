import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCoffeeRecommendationWeights,
  buildCoffeeTasteTestResult,
  buildCoffeeTasteVector,
} from './coffeeTasteTest.ts'

test('buildCoffeeTasteVector maps strong acidity preference to a high acidity score', () => {
  const vector = buildCoffeeTasteVector({
    acidity: 1,
    sweetness: 0,
    bitterness: -1,
    nutty: 0.5,
    body: 0,
    aroma: 1,
    milk: -1,
  })

  assert.equal(vector.acidity, 1)
  assert.equal(vector.bitterness, 0)
  assert.equal(vector.aroma, 1)
  assert.equal(vector.milk, 0)
})

test('buildCoffeeTasteVector keeps milk preference as an independent axis', () => {
  const black = buildCoffeeTasteVector({
    acidity: 0,
    sweetness: 0,
    bitterness: 0,
    nutty: 0,
    body: 0,
    aroma: 0,
    milk: -1,
  })
  const latte = buildCoffeeTasteVector({
    acidity: 0,
    sweetness: 0,
    bitterness: 0,
    nutty: 0,
    body: 0,
    aroma: 0,
    milk: 1,
  })

  assert.equal(black.sweetness, latte.sweetness)
  assert.equal(black.bitterness, latte.bitterness)
  assert.equal(black.body, latte.body)
  assert.equal(black.milk, 0)
  assert.equal(latte.milk, 1)
})

test('buildCoffeeRecommendationWeights keeps recommendation weights normalized', () => {
  const weights = buildCoffeeRecommendationWeights({
    acidity: 1,
    sweetness: 1,
    bitterness: 1,
    nutty: 1,
    body: 1,
    aroma: 1,
    milk: 0,
  })
  const total = weights.tasteMatch + weights.similarUser + weights.sentiment + weights.popularity

  assert.equal(Number(total.toFixed(6)), 1)
  assert.ok(weights.tasteMatch > 0.5)
})

test('buildCoffeeTasteTestResult returns vector, weights, and timestamp', () => {
  const result = buildCoffeeTasteTestResult({
    acidity: 0,
    sweetness: 0,
    bitterness: 0,
    nutty: 0,
    body: 0,
    aroma: 0,
    milk: 0,
  })

  assert.equal(result.vector.acidity, 0.5)
  assert.equal(typeof result.completedAt, 'string')
  assert.ok(result.weights.similarUser > 0)
})
