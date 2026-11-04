import { request } from './httpService'

export const api = {
  list: resource => request({ url: `/${resource}` }),
  get: (resource, id) => request({ url: `/${resource}/${id}` }),
  create: (resource, data) => request({ url: `/${resource}`, method: 'POST', data }),
  update: (resource, id, data) => request({ url: `/${resource}/${id}`, method: 'PATCH', data }),
  remove: (resource, id) => request({ url: `/${resource}/${id}`, method: 'DELETE' }),
  createMany: (resource, data) => request({ url: `/${resource}/multiple`, method: 'POST', data }),
}
