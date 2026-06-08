import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMenuTasteVectorsFromReviews,
  extractTasteVectorFromReview,
} from './reviewTasteVector.ts'

test('extractTasteVectorFromReview detects acidity and aroma keywords', () => {
  const vector = extractTasteVectorFromReview(
    '산미가 밝고 과일향이 좋아요. 향미도 복합적이에요.',
    'positive'
  )

  assert.ok(vector)
  assert.ok(vector.acidity > 0.7)
  assert.ok(vector.aroma > 0.6)
})

test('extractTasteVectorFromReview detects nutty and body keywords', () => {
  const vector = extractTasteVectorFromReview(
    '고소하고 견과류 같은 맛이 좋고 바디감이 묵직합니다.',
    'positive'
  )

  assert.ok(vector)
  assert.ok(vector.nutty > 0.7)
  assert.ok(vector.body > 0.6)
})

test('buildMenuTasteVectorsFromReviews aggregates vectors by menu', () => {
  const vectors = buildMenuTasteVectorsFromReviews([
    {
      menuId: 'menu-a',
      reviewText: '산미가 상큼하고 과일향이 좋습니다.',
      sentiment: 'positive',
    },
    {
      menuId: 'menu-a',
      reviewText: '향이 은은하고 달콤한 단맛이 있어요.',
      sentiment: 'positive',
    },
    {
      menuId: 'menu-b',
      reviewText: '쓴맛과 탄맛이 강했습니다.',
      sentiment: 'negative',
    },
  ])

  const menuA = vectors.get('menu-a')
  const menuB = vectors.get('menu-b')

  assert.ok(menuA)
  assert.ok(menuA.acidity > 0.4)
  assert.ok(menuA.aroma > 0.5)
  assert.ok(menuA.sweetness > 0.3)
  assert.ok(menuB)
  assert.ok(menuB.bitterness > 0.6)
})
