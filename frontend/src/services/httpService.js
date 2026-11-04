import axiosInstance from '@/lib/axios'

export async function request(config) {
  const response = await axiosInstance.request(config)
  return response.data.data
}
