import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateRecommendationScore,
  calculateSimilarUserScore,
  cosineSimilarity,
  getRecommendations,
  normalizeTasteVector,
} from './recommendations.ts'

const userVector = normalizeTasteVector({
  acidity: 0.8,
  sweetness: 0.6,
  bitterness: 0.2,
  nutty: 0.7,
  body: 0.5,
  aroma: 0.8,
  milk: 0.1,
})

test('cosineSimilarity returns higher score for a close taste vector', () => {
  const closeVector = normalizeTasteVector({
    acidity: 0.75,
    sweetness: 0.65,
    bitterness: 0.25,
    nutty: 0.72,
    body: 0.52,
    aroma: 0.82,
    milk: 0.12,
  })
  const distantVector = normalizeTasteVector({
    acidity: 0.1,
    sweetness: 0.1,
    bitterness: 0.9,
    nutty: 0.1,
    body: 0.9,
    aroma: 0.2,
    milk: 1,
  })

  assert.ok(cosineSimilarity(userVector, closeVector) > cosineSimilarity(userVector, distantVector))
})

test('calculateRecommendationScore applies the requested initial weights', () => {
  const score = calculateRecommendationScore({
    tasteMatchScore: 0.76,
    similarUserScore: 0.68,
    sentimentScore: 0.91,
    popularityScore: 0.43,
  })

  assert.equal(Number(score.toFixed(4)), 0.742)
})

test('calculateSimilarUserScore uses positive reviews from users with similar preferences', () => {
  const score = calculateSimilarUserScore({
    userId: 'user-a',
    userVector,
    menuId: 'menu-a',
    userPreferences: [
      { userId: 'user-b', vector: normalizeTasteVector({ ...userVector, acidity: 0.78 }) },
      { userId: 'user-c', vector: normalizeTasteVector({ bitterness: 1, milk: 1 }) },
    ],
    reviews: [
      { userId: 'user-b', cafeId: 'cafe-a', menuId: 'menu-a', sentiment: 'positive' },
      { userId: 'user-c', cafeId: 'cafe-a', menuId: 'menu-a', sentiment: 'negative' },
    ],
  })

  assert.ok(score > 0.9)
})

test('getRecommendations sorts results by final_score and includes reasons', () => {
  const recommendations = getRecommendations({
    userId: 'user-a',
    userVector,
    userPreferences: [
      { userId: 'user-b', vector: normalizeTasteVector({ ...userVector, aroma: 0.75 }) },
    ],
    reviews: [
      { userId: 'user-b', cafeId: 'cafe-a', menuId: 'menu-good', sentiment: 'positive' },
      { userId: 'user-b', cafeId: 'cafe-b', menuId: 'menu-bad', sentiment: 'negative' },
    ],
    items: [
      {
        cafeId: 'cafe-b',
        menuId: 'menu-bad',
        tasteVector: normalizeTasteVector({ bitterness: 1, body: 1, milk: 1 }),
        sentimentScore: 0.2,
        reviewCount: 2,
      },
      {
        cafeId: 'cafe-a',
        menuId: 'menu-good',
        tasteVector: normalizeTasteVector({ ...userVector }),
        sentimentScore: 0.9,
        reviewCount: 12,
      },
    ],
  })

  assert.equal(recommendations[0].menu_id, 'menu-good')
  assert.ok(recommendations[0].final_score >= recommendations[1].final_score)
  assert.ok(recommendations[0].reasons.length > 0)
})
