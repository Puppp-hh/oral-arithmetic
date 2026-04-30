import { request } from './request';
import { API } from '../constants/api';
import { ApiResponse } from '../types/index';

export interface SchoolSearchItem {
  id: string;
  name: string;
  address: string;
  location: string;
  district: string;
  city: string;
}

export function searchSchools(params: {
  keyword: string;
  city?: string;
}, silent = false): Promise<ApiResponse<{ list: SchoolSearchItem[]; total: number }>> {
  return request({
    url:     API.MAP_SCHOOL_SEARCH,
    data:    params,
    noToken: true,
    silent,
  });
}
