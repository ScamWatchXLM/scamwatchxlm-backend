import { describe, expect, it } from 'vitest';

import { buildPaginationMeta, normalizePagination } from '../../../src/utils/pagination.js';

describe('pagination utils', () => {
  it('defaults to page 1 with the default page size', () => {
    expect(normalizePagination({})).toEqual({ page: 1, pageSize: 25, skip: 0, take: 25 });
  });

  it('clamps page size to the configured maximum', () => {
    expect(normalizePagination({ pageSize: 1000 }).pageSize).toBe(100);
  });

  it('never produces a page below 1', () => {
    expect(normalizePagination({ page: -5 }).page).toBe(1);
  });

  it('computes total pages correctly', () => {
    expect(buildPaginationMeta(1, 25, 101)).toEqual({
      page: 1,
      pageSize: 25,
      total: 101,
      totalPages: 5,
    });
    expect(buildPaginationMeta(1, 25, 0)).toEqual({
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 1,
    });
  });
});
